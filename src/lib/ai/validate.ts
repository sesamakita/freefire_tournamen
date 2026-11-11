// src/lib/ai/validate.ts

export interface RecognizedTeamResult {
  rank: number;
  nama_tim: string;
  kills: number;
  terbaca: boolean;
  catatan?: string;
}

export interface AIRawOutput {
  confidence: number;
  teams: RecognizedTeamResult[];
  catatan?: string;
}

export interface MatchRegisteredTeam {
  team_id: string;
  team_name: string;
}

export interface ValidatedTeamScore {
  team_id: string;
  team_name: string;
  original_ai_name: string;
  rank: number;
  kills: number;
  terbaca: boolean;
  match_confidence: number; // 0 to 1 based on fuzzy match
  catatan?: string;
}

export interface ValidationSummary {
  isValid: boolean;
  overallConfidence: number;
  teams: ValidatedTeamScore[];
  errors: string[];
  warnings: string[];
  hasUncertainRows: boolean;
}

/**
 * Calculates string similarity between two names (Dice Coefficient / Bigram overlap + Substring boost)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = str2.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  // Substring bonus: if one is full substring of another (e.g. "RRQ" inside "RRQ KAZU")
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.max(0.75, minLen / maxLen);
  }

  // Bigram token overlap
  if (s1.length < 2 || s2.length < 2) return 0;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  let intersection = 0;
  b1.forEach((bg) => {
    if (b2.has(bg)) intersection++;
  });

  return (2 * intersection) / (b1.size + b2.size);
}

/**
 * Validates and cross-checks AI scoreboard reading results against match participants
 */
export function validasiHasilAI(
  aiOutput: AIRawOutput,
  registeredTeams: MatchRegisteredTeam[]
): ValidationSummary {
  const errors: string[] = [];
  const warnings: string[] = [];
  const teamCount = registeredTeams.length;

  if (!aiOutput || !Array.isArray(aiOutput.teams)) {
    return {
      isValid: false,
      overallConfidence: 0,
      teams: [],
      errors: ["Format output AI tidak valid atau tidak memiliki daftar tim."],
      warnings: [],
      hasUncertainRows: true,
    };
  }

  const rawTeams = aiOutput.teams;

  // 1. Check row count
  if (rawTeams.length !== teamCount) {
    warnings.push(
      `AI mendeteksi ${rawTeams.length} tim, namun match ini memiliki ${teamCount} tim.`
    );
  }

  // 2. Check placement uniqueness
  const ranksSeen = new Set<number>();
  let hasDuplicateRanks = false;
  for (const t of rawTeams) {
    if (ranksSeen.has(t.rank)) {
      hasDuplicateRanks = true;
    }
    ranksSeen.add(t.rank);
  }
  if (hasDuplicateRanks) {
    errors.push("Ditemukan ranking kembar pada pembacaan AI.");
  }

  // 3. Kill sanity checks
  const maxPossibleKillsInGame = Math.max(0, (teamCount - 1) * 4);
  let totalKills = 0;

  for (const t of rawTeams) {
    if (t.kills < 0) {
      errors.push(`Jumlah kill tim ${t.nama_tim} tidak boleh bernilai negatif (${t.kills}).`);
    }
    if (t.kills > maxPossibleKillsInGame) {
      errors.push(
        `Kill tim ${t.nama_tim} (${t.kills}) melebihi batas lawan yang mungkin ada (${maxPossibleKillsInGame}).`
      );
    }
    totalKills += t.kills;
  }

  if (totalKills > teamCount * 4) {
    errors.push(
      `Total kill seluruh tim (${totalKills}) melebihi jumlah maksimal pemain (${teamCount * 4}).`
    );
  }

  // 4. Fuzzy match each recognized team with registered match participants
  const usedRegisteredTeamIds = new Set<string>();
  const validatedTeams: ValidatedTeamScore[] = [];
  let hasUncertainRows = false;

  for (const rawTeam of rawTeams) {
    let bestMatch: MatchRegisteredTeam | null = null;
    let highestSim = 0;

    for (const reg of registeredTeams) {
      if (usedRegisteredTeamIds.has(reg.team_id)) continue;
      const sim = calculateSimilarity(rawTeam.nama_tim, reg.team_name);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = reg;
      }
    }

    // Similarity threshold: >= 0.5 considered a reasonable match
    const isNameConfident = highestSim >= 0.5 && bestMatch !== null;
    const isRowClear = rawTeam.terbaca && isNameConfident;

    if (!isRowClear) {
      hasUncertainRows = true;
    }

    if (bestMatch && highestSim >= 0.4) {
      usedRegisteredTeamIds.add(bestMatch.team_id);
      validatedTeams.push({
        team_id: bestMatch.team_id,
        team_name: bestMatch.team_name,
        original_ai_name: rawTeam.nama_tim,
        rank: rawTeam.rank,
        kills: rawTeam.kills,
        terbaca: isRowClear,
        match_confidence: highestSim,
        catatan: !isNameConfident
          ? `Nama terdeteksi "${rawTeam.nama_tim}" agak berbeda dengan "${bestMatch.team_name}"`
          : rawTeam.catatan,
      });
    } else {
      // Could not confidently map team
      hasUncertainRows = true;
      warnings.push(`Nama tim "${rawTeam.nama_tim}" tidak cocok dengan tim peserta mana pun.`);
    }
  }

  // Check any registered teams that were not detected by AI
  const missingTeams = registeredTeams.filter((r) => !usedRegisteredTeamIds.has(r.team_id));
  if (missingTeams.length > 0) {
    warnings.push(
      `${missingTeams.length} tim peserta belum terdeteksi AI: ${missingTeams
        .map((m) => m.team_name)
        .join(", ")}`
    );
  }

  const overallConfidence = aiOutput.confidence ?? (hasUncertainRows ? 0.65 : 0.95);

  return {
    isValid: errors.length === 0,
    overallConfidence,
    teams: validatedTeams,
    errors,
    warnings,
    hasUncertainRows,
  };
}
