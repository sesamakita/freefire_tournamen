// app/routes/api.$.ts
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { requestContext } from "@/lib/supabase/server";

// Import semua handler API yang ada di src/app_views/api
import * as TournamentsRoot from "@/app/api/tournaments/route";
import * as TournamentsStaffRespond from "@/app/api/tournaments/staff/respond/route";
import * as TournamentDetail from "@/app/api/tournaments/[id]/route";
import * as TournamentSponsors from "@/app/api/tournaments/[id]/sponsors/route";
import * as TournamentSponsorDetail from "@/app/api/tournaments/[id]/sponsors/[sponsorId]/route";
import * as TournamentMatches from "@/app/api/tournaments/[id]/matches/route";
import * as TournamentMatchRoom from "@/app/api/tournaments/[id]/matches/[matchId]/room/route";
import * as TournamentMatchSlots from "@/app/api/tournaments/[id]/matches/[matchId]/slots/route";
import * as TournamentMatchResults from "@/app/api/tournaments/[id]/matches/[matchId]/results/route";
import * as TournamentMatchResultsVerify from "@/app/api/tournaments/[id]/matches/[matchId]/results/verify/route";
import * as TournamentBracket from "@/app/api/tournaments/[id]/bracket/route";
import * as TournamentBracketRoom from "@/app/api/tournaments/[id]/bracket/[bracketId]/room/route";
import * as TournamentBracketScore from "@/app/api/tournaments/[id]/bracket/[bracketId]/score/route";
import * as TournamentStaff from "@/app/api/tournaments/[id]/staff/route";
import * as TournamentTeams from "@/app/api/tournaments/[id]/teams/route";
import * as TournamentTeamVerify from "@/app/api/tournaments/[id]/teams/[teamId]/verify/route";
import * as TournamentStandings from "@/app/api/tournaments/[id]/standings/route";

import * as TeamsRoot from "@/app/api/teams/route";
import * as TeamDetail from "@/app/api/teams/[teamId]/route";
import * as TeamMemberDetail from "@/app/api/teams/[teamId]/members/[memberId]/route";
import * as TeamPayment from "@/app/api/teams/[teamId]/payment/route";
import * as TeamQris from "@/app/api/teams/[teamId]/qris/route";

import * as InvitationsRoot from "@/app/api/invitations/route";
import * as InvitationAccept from "@/app/api/invitations/[token]/accept/route";
import * as InvitationDecline from "@/app/api/invitations/[token]/decline/route";
import * as UserProfile from "@/app/api/user/profile/route";

interface RouteDefinition {
  pattern: RegExp;
  paramKeys: string[];
  module: any;
}

function createRoute(patternStr: string, module: any): RouteDefinition {
  const paramKeys: string[] = [];
  const regexStr = patternStr.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
    paramKeys.push(key);
    return "([^/]+)";
  });
  return {
    pattern: new RegExp(`^${regexStr}$`),
    paramKeys,
    module,
  };
}

const routes: RouteDefinition[] = [
  // 1. Tournaments
  createRoute("tournaments", TournamentsRoot),
  createRoute("tournaments/staff/respond", TournamentsStaffRespond),
  createRoute("tournaments/:id/sponsors", TournamentSponsors),
  createRoute("tournaments/:id/sponsors/:sponsorId", TournamentSponsorDetail),
  createRoute("tournaments/:id/matches/:matchId/room", TournamentMatchRoom),
  createRoute("tournaments/:id/matches/:matchId/slots", TournamentMatchSlots),
  createRoute("tournaments/:id/matches/:matchId/results/verify", TournamentMatchResultsVerify),
  createRoute("tournaments/:id/matches/:matchId/results", TournamentMatchResults),
  createRoute("tournaments/:id/matches", TournamentMatches),
  createRoute("tournaments/:id/bracket/:bracketId/room", TournamentBracketRoom),
  createRoute("tournaments/:id/bracket/:bracketId/score", TournamentBracketScore),
  createRoute("tournaments/:id/bracket", TournamentBracket),
  createRoute("tournaments/:id/staff", TournamentStaff),
  createRoute("tournaments/:id/teams/:teamId/verify", TournamentTeamVerify),
  createRoute("tournaments/:id/teams", TournamentTeams),
  createRoute("tournaments/:id/standings", TournamentStandings),
  createRoute("tournaments/:id", TournamentDetail),

  // 2. Teams
  createRoute("teams", TeamsRoot),
  createRoute("teams/:teamId/members/:memberId", TeamMemberDetail),
  createRoute("teams/:teamId/payment", TeamPayment),
  createRoute("teams/:teamId/qris", TeamQris),
  createRoute("teams/:teamId", TeamDetail),

  // 3. Invitations
  createRoute("invitations/:token/accept", InvitationAccept),
  createRoute("invitations/:token/decline", InvitationDecline),
  createRoute("invitations", InvitationsRoot),

  // 4. User
  createRoute("user/profile", UserProfile),
];

async function dispatch(request: Request, splat: string | undefined) {
  const cleanPath = (splat || "").replace(/^\/+|\/+$/g, "");
  const method = request.method.toUpperCase();

  for (const r of routes) {
    const match = cleanPath.match(r.pattern);
    if (match) {
      const params: Record<string, string> = {};
      r.paramKeys.forEach((key, index) => {
        params[key] = match[index + 1];
      });

      const handler = r.module[method];
      if (!handler || typeof handler !== "function") {
        return Response.json(
          { success: false, error: { message: `Metode HTTP ${method} tidak didukung pada endpoint ini.` } },
          { status: 405 }
        );
      }

      const responseHeaders = new Headers();
      try {
        return await requestContext.run({ request, responseHeaders }, async () => {
          const res = await handler(request, { params: Promise.resolve(params) });
          // Copy any cookies that were set
          responseHeaders.forEach((val, key) => {
            res.headers.append(key, val);
          });
          return res;
        });
      } catch (err: any) {
        console.error(`API Dispatch Error on ${cleanPath}:`, err);
        return Response.json(
          { success: false, error: { message: err?.message || "Internal Server Error" } },
          { status: 500 }
        );
      }
    }
  }

  return Response.json(
    { success: false, error: { message: `Endpoint /api/${cleanPath} tidak ditemukan.` } },
    { status: 404 }
  );
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  return dispatch(request, params["*"]);
}

export async function action({ request, params }: ActionFunctionArgs) {
  return dispatch(request, params["*"]);
}
