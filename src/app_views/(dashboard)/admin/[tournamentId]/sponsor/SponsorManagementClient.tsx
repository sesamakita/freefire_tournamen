"use client";

import { useState } from "react";
import { Link } from "react-router";
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Radio,
  Tv,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export interface Sponsor {
  id: string;
  tournament_id: string;
  name: string;
  logo_url: string;
  banner_url?: string | null;
  tier: "title" | "main" | "supporter" | "media_partner";
  external_url?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

interface Props {
  tournamentId: string;
  tournamentName: string;
  initialSponsors: Sponsor[];
  isOwnerOrAdmin: boolean;
}

const TIER_CONFIG = {
  title: {
    label: "Title Sponsor",
    badge: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40",
    desc: "Sponsor utama judul turnamen. Ditampilkan paling dominan di setiap frame overlay & intro siaran.",
  },
  main: {
    label: "Official Partner",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    desc: "Partner resmi turnamen dengan rotasi banner prioritas tinggi di layar jeda (intermission).",
  },
  media_partner: {
    label: "Media Partner",
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    desc: "Partner media publikasi dan penyiaran turnamen.",
  },
  supporter: {
    label: "Supporting Sponsor",
    badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
    desc: "Sponsor pendukung turnamen dalam running ticker lower-third.",
  },
};

export default function SponsorManagementClient({
  tournamentId,
  tournamentName,
  initialSponsors,
  isOwnerOrAdmin,
}: Props) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    logo_url: string;
    banner_url: string;
    tier: "title" | "main" | "supporter" | "media_partner";
    external_url: string;
    display_order: number;
    is_active: boolean;
  }>({
    name: "",
    logo_url: "",
    banner_url: "",
    tier: "main",
    external_url: "",
    display_order: 1,
    is_active: true,
  });

  const handleOpenAdd = () => {
    setEditingSponsor(null);
    setFormData({
      name: "",
      logo_url: "",
      banner_url: "",
      tier: "main",
      external_url: "",
      display_order: sponsors.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Sponsor) => {
    setEditingSponsor(s);
    setFormData({
      name: s.name,
      logo_url: s.logo_url,
      banner_url: s.banner_url || "",
      tier: s.tier,
      external_url: s.external_url || "",
      display_order: s.display_order ?? 1,
      is_active: s.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleApplyPreset = () => {
    setFormData({
      name: "Monster Energy Drink",
      logo_url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80",
      banner_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&auto=format&fit=crop&q=80",
      tier: "title",
      external_url: "https://monsterenergy.com",
      display_order: sponsors.length + 1,
      is_active: true,
    });
    toast.info("Preset contoh data sponsor berhasil dimuat ke formulir!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.logo_url.trim()) {
      toast.error("Nama sponsor dan URL logo wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingSponsor) {
        // Update existing sponsor
        const res = await fetch(`/api/tournaments/${tournamentId}/sponsors/${editingSponsor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            logo_url: formData.logo_url.trim(),
            banner_url: formData.banner_url.trim() || null,
            tier: formData.tier,
            external_url: formData.external_url.trim() || null,
            display_order: Number(formData.display_order) || 1,
            is_active: formData.is_active,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Gagal memperbarui sponsor.");

        setSponsors((prev) =>
          prev.map((s) => (s.id === editingSponsor.id ? { ...s, ...json.data } : s))
        );
        toast.success("Sponsor berhasil diperbarui!");
      } else {
        // Create new sponsor
        const res = await fetch(`/api/tournaments/${tournamentId}/sponsors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            logo_url: formData.logo_url.trim(),
            banner_url: formData.banner_url.trim() || null,
            tier: formData.tier,
            external_url: formData.external_url.trim() || null,
            display_order: Number(formData.display_order) || 1,
            is_active: formData.is_active,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Gagal menambahkan sponsor.");

        setSponsors((prev) => [...prev, json.data]);
        toast.success("Sponsor baru berhasil ditambahkan ke rotasi siaran OBS!");
      }

      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (sponsor: Sponsor) => {
    const nextStatus = !sponsor.is_active;
    try {
      // Optimistic update
      setSponsors((prev) =>
        prev.map((s) => (s.id === sponsor.id ? { ...s, is_active: nextStatus } : s))
      );

      const res = await fetch(`/api/tournaments/${tournamentId}/sponsors/${sponsor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (!res.ok) {
        throw new Error("Gagal mengubah status aktif sponsor.");
      }

      toast.success(
        nextStatus
          ? `Sponsor "${sponsor.name}" sekarang AKTIF tayang di overlay OBS!`
          : `Sponsor "${sponsor.name}" dinonaktifkan dari siaran.`
      );
    } catch (err: any) {
      // Revert optimistic update
      setSponsors((prev) =>
        prev.map((s) => (s.id === sponsor.id ? { ...s, is_active: sponsor.is_active } : s))
      );
      toast.error(err.message || "Gagal memperbarui status.");
    }
  };

  const handleDelete = async (sponsorId: string, name: string) => {
    if (!confirm(`Hapus sponsor "${name}" dari turnamen ini?`)) return;

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/sponsors/${sponsorId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus sponsor.");

      setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
      toast.success(`Sponsor "${name}" berhasil dihapus.`);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus sponsor.");
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Tautan OBS berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://arenatempur.com";
  const intermissionUrl = `${origin}/overlay/${tournamentId}/intermission`;
  const tickerUrl = `${origin}/overlay/${tournamentId}/ticker`;

  const activeCount = sponsors.filter((s) => s.is_active).length;
  const bannerCount = sponsors.filter((s) => s.is_active && s.banner_url).length;

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Actions */}
      <div className="card-glow p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
            <Megaphone className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Pusat Monetisasi & Mitra
              </span>
              <span className="text-xs text-zinc-500">&bull;</span>
              <span className="text-xs text-zinc-400 font-medium">
                {activeCount} dari {sponsors.length} Sponsor Tayang
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Manajemen Sponsor & Iklan Siaran
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
              Daftarkan mitra sponsor turnamen Anda. Logo otomatis berputar di Ticker siaran dan Banner 16:9 tampil di layar jeda (Intermission Commercial Break) OBS Studio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Sponsor Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Ringkasan Statistik & Status OBS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-glow p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
          <p className="text-xs text-zinc-500 font-medium">Total Sponsor</p>
          <p className="text-2xl font-black text-white mt-1">{sponsors.length}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Terdaftar di turnamen</p>
        </div>

        <div className="card-glow p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
          <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Aktif di Siaran OBS
          </p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Muncul di Ticker & Live</p>
        </div>

        <div className="card-glow p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
          <p className="text-xs text-amber-400 font-medium">Banner Jeda (16:9)</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{bannerCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Rotasi di layar intermission</p>
        </div>

        <div className="card-glow p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
          <div>
            <p className="text-xs text-red-400 font-medium flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              Kontrol Siaran Live
            </p>
            <p className="text-xs text-zinc-400 mt-1">Nyalakan layar jeda di Pusat Siaran</p>
          </div>
          <Link
            to={`/admin/${tournamentId}/live`}
            className="mt-2 text-xs text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1"
          >
            <span>Buka Panel Live & OBS</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 3. Integrasi Tautan OBS Studio */}
      <div className="card-glow p-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-3">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Tv className="w-4 h-4 text-amber-400" />
          URL Browser Source untuk OBS Studio Panitia
        </h3>
        <p className="text-xs text-zinc-400">
          Tempelkan tautan berikut ke OBS Studio sebagai <b>Browser Source</b> agar logo & banner sponsor otomatis muncul secara profesional.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Tautan Layar Jeda */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Layar Jeda (Intermission 1080p)
              </span>
              <p className="text-xs font-mono text-zinc-300 truncate">{intermissionUrl}</p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(intermissionUrl, "intermission")}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 inline-flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
            >
              {copiedKey === "intermission" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Disalin
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Salin URL
                </>
              )}
            </button>
          </div>

          {/* Tautan Ticker Bawah */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Lower-Third Sponsor Ticker
              </span>
              <p className="text-xs font-mono text-zinc-300 truncate">{tickerUrl}</p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(tickerUrl, "ticker")}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 inline-flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
            >
              {copiedKey === "ticker" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Disalin
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Salin URL
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Panduan & Kategori Tier Sponsor */}
      <div className="card-glow p-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Kategori & Tingkatan (Tier) Sponsor Turnamen
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">4 Tingkat Mitra</span>
        </div>
        <p className="text-xs text-zinc-400">
          Tentukan tier sponsor untuk mengatur prioritas tampilan logo di overlay dan rotasi banner 16:9 saat jeda pertandingan (Intermission Commercial Break):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {Object.entries(TIER_CONFIG).map(([key, info]) => (
            <div
              key={key}
              className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 hover:border-zinc-700 transition-colors"
            >
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${info.badge}`}>
                {info.label}
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {info.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Daftar Sponsor (Grid Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Daftar Sponsor Turnamen</span>
            <span className="text-xs font-medium text-zinc-500">({sponsors.length} terdaftar)</span>
          </h2>

          {sponsors.length > 0 && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Lagi</span>
            </button>
          )}
        </div>

        {sponsors.length === 0 ? (
          <div className="card-glow p-12 rounded-2xl border border-zinc-800/80 text-center space-y-4 bg-zinc-950/40">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-200">Belum Ada Sponsor Terdaftar</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                Daftarkan sponsor dan pasang logo serta banner komersial agar tayang di siaran langsung turnamen Anda.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Tambah Sponsor Pertama</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sponsors.map((s) => {
              const tierInfo = TIER_CONFIG[s.tier] || TIER_CONFIG.supporter;

              return (
                <div
                  key={s.id}
                  className={`card-glow p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    s.is_active
                      ? "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700"
                      : "border-zinc-900 bg-zinc-950/40 opacity-60"
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Header Card: Tier & Status Toggle */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${tierInfo.badge}`}
                      >
                        {tierInfo.label}
                      </span>

                      {/* Toggle Tayang di OBS */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          s.is_active
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                        }`}
                        title="Klik untuk mengubah status tayang di OBS"
                      >
                        {s.is_active ? (
                          <>
                            <Eye className="w-3 h-3" /> Tayang di OBS
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Nonaktif
                          </>
                        )}
                      </button>
                    </div>

                    {/* Logo & Info Sponsor */}
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                        {s.logo_url ? (
                          <img
                            src={s.logo_url}
                            alt={s.name}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-zinc-600" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-white tracking-tight truncate">
                          {s.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Urutan Tayang: <b className="text-zinc-200">#{s.display_order}</b>
                        </p>
                        {s.external_url && (
                          <a
                            href={s.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 mt-1 truncate max-w-full font-medium"
                          >
                            <span className="truncate">{s.external_url}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Banner Jeda Preview */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Banner Iklan Jeda (16:9):
                      </span>
                      {s.banner_url ? (
                        <div className="w-full aspect-video rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden relative group">
                          <img
                            src={s.banner_url}
                            alt={`Banner ${s.name}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-1 rounded">
                              Preview 16:9
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full py-3 rounded-xl bg-zinc-900/50 border border-dashed border-zinc-800 text-center">
                          <p className="text-[10px] text-zinc-500">
                            Belum ada banner 16:9 (hanya logo yang tayang)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi Bawah */}
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-500">
                      {s.is_active ? "🟢 Siaran Aktif" : "⚪ Tidak Tayang"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:text-amber-400 text-zinc-300 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit Sponsor"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs transition-colors cursor-pointer"
                        title="Hapus Sponsor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Modal Tambah / Edit Sponsor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingSponsor ? "Edit Sponsor Turnamen" : "Tambah Sponsor Baru"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Atur identitas sponsor dan media visual untuk siaran livestream turnamen
                </p>
              </div>

              {!editingSponsor && (
                <button
                  type="button"
                  onClick={handleApplyPreset}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title="Isi otomatis dengan gambar contoh"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gunakan Contoh</span>
                </button>
              )}
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Nama Sponsor */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nama Sponsor / Mitra <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Monster Energy, Toko Gaming Palu, Indomie"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Kategori Tier & Urutan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Kategori / Tingkat Sponsor
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
                  >
                    <option value="title">👑 Title Sponsor (Prioritas Utama)</option>
                    <option value="main">💎 Official Partner</option>
                    <option value="media_partner">📢 Media Partner</option>
                    <option value="supporter">⭐ Supporting Sponsor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Urutan rotasi pada slideshow iklan</p>
                </div>
              </div>

              {/* URL Logo Sponsor */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  URL Logo Sponsor (Format PNG Transparan disarankan) <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://domain.com/logo-sponsor.png"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
                />

                {/* Preview Logo */}
                {formData.logo_url && (
                  <div className="mt-2 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                    <img
                      src={formData.logo_url}
                      alt="Preview Logo"
                      className="w-10 h-10 object-contain rounded bg-zinc-950 p-1"
                      referrerPolicy="no-referrer"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                    <span className="text-[11px] text-emerald-400 font-medium">
                      ✓ Preview logo berhasil dimuat
                    </span>
                  </div>
                )}
              </div>

              {/* URL Banner Jeda (16:9) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  URL Banner Iklan Jeda (Resolusi 1920x1080 / Aspek 16:9)
                </label>
                <input
                  type="url"
                  placeholder="https://domain.com/banner-promo-16-9.jpg"
                  value={formData.banner_url}
                  onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Banner ini akan diputar otomatis bergantian setiap 6 detik saat layar jeda pertandingan (Intermission Commercial Break) dinyalakan.
                </p>

                {/* Preview Banner */}
                {formData.banner_url && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800 aspect-video max-w-xs">
                    <img
                      src={formData.banner_url}
                      alt="Preview Banner"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  </div>
                )}
              </div>

              {/* Website / Tautan Eksternal */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Website / Media Sosial Sponsor (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://instagram.com/sponsor-anda"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Checkbox Aktif */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                  />
                  <span className="text-xs font-bold text-zinc-200">
                    Aktifkan dan tayangkan langsung ke Overlay Siaran OBS
                  </span>
                </label>
              </div>

              {/* Tombol Aksi */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Menyimpan..." : editingSponsor ? "Simpan Perubahan" : "Tambahkan Sponsor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
