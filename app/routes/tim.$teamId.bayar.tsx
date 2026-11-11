import { useLoaderData, Link, redirect } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { ArrowLeft, CreditCard, Shield, QrCode } from "lucide-react";
import { createWebClient } from "@/lib/supabase/web";
import PaymentForm from "@/app/(dashboard)/tim/[teamId]/bayar/PaymentForm";

export const meta: MetaFunction = () => {
  return [
    { title: "Pembayaran & Verifikasi Tim — Arena Tempur" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { teamId } = params;
  if (!teamId) throw redirect("/dashboard");

  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Ambil data tim & turnamen
  const { data: team } = await db
    .from("teams")
    .select(`
      *,
      tournaments:tournament_id (id, nama, entry_fee, qris_image_url, direct_payment_info, format)
    `)
    .eq("id", teamId)
    .single();

  if (!team) throw new Response("Tim tidak ditemukan", { status: 404 });

  // Pastikan user adalah kapten tim
  if (team.kapten_user_id !== user.id) {
    throw redirect("/dashboard");
  }

  // 2. Cek apakah tim sudah punya minimal pemain inti yang disyaratkan
  // Mode 1v1 (Lone Wolf) hanya butuh 1 pemain (kapten itu sendiri)
  // Mode Battle Royale butuh minimal 4 pemain inti (BR-ROST-01)
  const isLoneWolf = team.tournaments?.format === "lone_wolf_1v1";
  const minRequiredMembers = isLoneWolf ? 1 : 4;

  const { count: coreCount } = await db
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("is_substitute", false);

  if ((coreCount || 0) < minRequiredMembers) {
    throw redirect(`/tim/${teamId}/roster`);
  }

  const entryFee = team.tournaments?.entry_fee ?? 0;
  const isFree = entryFee === 0;

  return {
    team,
    coreCount: coreCount || 0,
    entryFee,
    isFree,
  };
}

export default function TeamPaymentPage() {
  const { team, coreCount, entryFee, isFree } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          to={`/tim/${team.id}/roster`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Roster Tim
        </Link>
      </div>

      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl text-white tracking-tight font-headline">
              Pembayaran & Verifikasi Tim (SCR-T03)
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Selesaikan pendaftaran tim &ldquo;{team.nama}&rdquo; untuk verifikasi panitia
            </p>
          </div>
        </div>
      </div>

      {/* Rincian Biaya */}
      <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
        <h2 className="text-sm text-white uppercase flex items-center gap-2 font-headline">
          <Shield className="w-4 h-4 text-amber-500" />
          Rincian Turnamen
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-2 border-b border-zinc-800/80">
            <span className="text-zinc-400">Turnamen</span>
            <span className="font-bold text-white">{team.tournaments?.nama}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-zinc-800/80">
            <span className="text-zinc-400">Nama Tim</span>
            <span className="font-bold text-amber-400">{team.nama}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-zinc-800/80">
            <span className="text-zinc-400">Jumlah Pemain Inti</span>
            <span className="font-bold text-zinc-200">{coreCount} Pemain Inti</span>
          </div>

          <div className="flex justify-between py-2 items-center">
            <span className="text-sm font-semibold text-zinc-300">Total Biaya Pendaftaran</span>
            <span className="text-xl font-black text-emerald-400">
              {isFree ? "GRATIS (Rp 0)" : `Rp ${entryFee.toLocaleString("id-ID")}`}
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk QRIS Manual (Jika Berbayar) */}
      {!isFree && (
        <div className="card-glow card-glow-hover p-6 rounded-2xl space-y-4">
          <h2 className="text-sm text-white uppercase flex items-center gap-2 font-headline">
            <QrCode className="w-4 h-4 text-amber-500" />
            Panduan Pembayaran QRIS Manual
          </h2>

          <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
            <p>1. Buka aplikasi e-wallet (GoPay, OVO, Dana) atau Mobile Banking Anda.</p>
            <p>
              2. Transfer tepat senilai{" "}
              <span className="font-bold text-white">Rp {entryFee.toLocaleString("id-ID")}</span>.
            </p>
            <p>
              3. Cantumkan nama tim{" "}
              <span className="font-bold text-amber-400 font-mono">&ldquo;{team.nama}&rdquo;</span>{" "}
              pada berita/catatan transfer.
            </p>
            <p>
              4. Ambil tangkapan layar (screenshot) bukti transfer yang sah dan upload di form bawah
              ini.
            </p>
          </div>

          {/* Data Rekening Panitia */}
          {team.tournaments?.direct_payment_info?.account_number && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                REKENING TUJUAN TRANSFER PANITIA
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 uppercase font-semibold">
                    {team.tournaments.direct_payment_info.bank_name || "Bank / E-Wallet"}
                  </p>
                  <p className="text-lg font-black text-amber-400 font-mono select-all tracking-wider">
                    {team.tournaments.direct_payment_info.account_number}
                  </p>
                  <p className="text-xs text-zinc-300 font-medium">
                    a.n {team.tournaments.direct_payment_info.account_holder || "Panitia Penyelenggara"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(team.tournaments?.direct_payment_info?.qris_image_url || team.tournaments?.qris_image_url) && (
            <div className="text-center pt-2">
              <img
                src={team.tournaments?.direct_payment_info?.qris_image_url || team.tournaments?.qris_image_url}
                alt="QRIS Penyelenggara"
                className="w-52 h-52 mx-auto rounded-xl border border-zinc-700 object-contain bg-white p-2"
              />
              <p className="text-[11px] text-zinc-400 font-semibold mt-1.5">
                Scan QRIS Panitia di atas melalui DANA, GoPay, OVO, ShopeePay, atau Mobile Banking
              </p>
            </div>
          )}
        </div>
      )}

      {/* Form Pembayaran QRIS Otomatis & Manual */}
      <PaymentForm teamId={team.id} isFree={isFree} entryFee={entryFee} />
    </div>
  );
}
