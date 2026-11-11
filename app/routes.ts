import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // 1. Public Discovery & Landing
  index("routes/_index.tsx"),
  route("cari", "routes/cari.tsx"),
  route("dev", "routes/dev.tsx"),

  // 2. Auth Routes with Centered Card Layout
  layout("routes/auth.layout.tsx", [
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("lupa-password", "routes/lupa-password.tsx"),
  ]),

  // 3. Public Tournament Hub
  route("t/:slug", "routes/t.$slug.layout.tsx", [
    index("routes/t.$slug._index.tsx"),
    route("klasemen", "routes/t.$slug.klasemen.tsx"),
    route("bracket", "routes/t.$slug.bracket.tsx"),
    route("jadwal", "routes/t.$slug.jadwal.tsx"),
    route("live", "routes/t.$slug.live.tsx"),
  ]),

  // 4. Authenticated Dashboard, Teams, & Tournament Admin Portal
  layout("routes/dashboard.layout.tsx", [
    route("dashboard", "routes/dashboard._index.tsx"),
    route("profil", "routes/profil.tsx"),
    route("dompet", "routes/dompet.tsx"),

    // Team Management
    route("tim/buat", "routes/tim.buat.tsx"),
    route("tim/bergabung/:token", "routes/tim.bergabung.$token.tsx"),
    route("tim/:teamId/roster", "routes/tim.$teamId.roster.tsx"),
    route("tim/:teamId/bayar", "routes/tim.$teamId.bayar.tsx"),
    route("tim/:teamId/jadwal", "routes/tim.$teamId.jadwal.tsx"),

    // Admin Tournament Management
    route("admin", "routes/admin._index.tsx"),
    route("admin/turnamen/buat", "routes/admin.turnamen.buat.tsx"),
    route("admin/ai-settings", "routes/admin.ai-settings.tsx"),
    route("admin/:tournamentId", "routes/admin.$tournamentId._index.tsx"),
    route("admin/:tournamentId/edit", "routes/admin.$tournamentId.edit.tsx"),
    route("admin/:tournamentId/match", "routes/admin.$tournamentId.match.tsx"),
    route("admin/:tournamentId/verifikasi", "routes/admin.$tournamentId.verifikasi.tsx"),
    route("admin/:tournamentId/skor", "routes/admin.$tournamentId.skor.tsx"),
    route("admin/:tournamentId/bracket", "routes/admin.$tournamentId.bracket.tsx"),
    route("admin/:tournamentId/panitia", "routes/admin.$tournamentId.panitia.tsx"),
    route("admin/:tournamentId/sponsor", "routes/admin.$tournamentId.sponsor.tsx"),
    route("admin/:tournamentId/live", "routes/admin.$tournamentId.live.tsx"),
  ]),

  // 5. OBS Studio Broadcast Overlays (Borderless Transparent / Dynamic)
  route("overlay/:tournamentId/intermission", "routes/overlay.$tournamentId.intermission.tsx"),
  route("overlay/:tournamentId/leaderboard", "routes/overlay.$tournamentId.leaderboard.tsx"),
  route("overlay/:tournamentId/ticker", "routes/overlay.$tournamentId.ticker.tsx"),
  route("overlay/:tournamentId/bracket", "routes/overlay.$tournamentId.bracket.tsx"),
  route("overlay/:tournamentId/intro", "routes/overlay.$tournamentId.intro.tsx"),

  // 6. API Resource Routes
  route("api/health", "routes/api.health.ts"),
  route("api/ai/config", "routes/api.ai.config.ts"),
  route("api/ai/test", "routes/api.ai.test.ts"),
  route("api/ai/read-scoreboard", "routes/api.ai.read-scoreboard.ts"),
  route("api/auth/logout", "routes/api.auth.logout.ts"),
  route("api/webhooks/payment", "routes/api.webhooks.payment.ts"),
  // Universal API Dispatcher for all tournament, team, invitation, sponsor, & user endpoints
  route("api/*", "routes/api.$.ts"),
] satisfies RouteConfig;
