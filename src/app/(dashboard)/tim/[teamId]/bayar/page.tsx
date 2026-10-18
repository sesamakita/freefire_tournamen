import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CreditCard, Shield, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PaymentForm from "./PaymentForm";

export default async function TeamPaymentPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Ambil data tim & turnamen
  const { data: team } = await db
    .from("teams")
    .select(`
      *,
      tournaments:tournament_id (id, nama, entry_fee, qris_image_url)
    `)
    .eq("id", teamId)
    .single();

  if (!team) notFound();

  // Pastikan user adalah kapten tim
  if (team.kapten_user_id !== user.id) {
    redirect("/dashboard");
  }

  // 2. Cek apakah tim sudah punya minimal 4 pemain inti (BR-ROST-01)
  const { count: coreCount } = await db
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("is_substitute", false);

  if ((coreCount || 0) < 4) {
    redirect(`/tim/${teamId}/roster`);
  }

  const entryFee = team.tournaments?.entry_fee ?? 0;
  const isFree = entryFee === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/tim/${teamId}/roster`}
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
            <h1 className="text-xl font-bold text-white tracking-tight">
              Pembayaran & Verifikasi Tim (SCR-T03)
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Selesaikan pendaftaran tim "{team.nama}" untuk verifikasi panitia
            </p>
          </div>
        </div>
      </div>

      {/* Rincian Biaya */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
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
        <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <QrCode className="w-4 h-4 text-amber-500" />
            Panduan Pembayaran QRIS Manual
          </h2>

          <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
            <p>1. Buka aplikasi e-wallet (GoPay, OVO, Dana) atau Mobile Banking Anda.</p>
            <p>2. Transfer tepat senilai <span className="font-bold text-white">Rp {entryFee.toLocaleString("id-ID")}</span>.</p>
            <p>3. Cantumkan nama tim <span className="font-bold text-amber-400 font-mono">"{team.nama}"</span> pada berita/catatan transfer.</p>
            <p>4. Ambil tangkapan layar (screenshot) bukti transfer yang sah dan upload di form bawah ini.</p>
          </div>

          {team.tournaments?.qris_image_url && (
            <div className="text-center pt-2">
              <img
                src={team.tournaments.qris_image_url}
                alt="QRIS Penyelenggara"
                className="w-48 h-48 mx-auto rounded-xl border border-zinc-700 object-cover"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5">Scan kode QRIS di atas untuk melakukan transfer</p>
            </div>
          )}
        </div>
      )}

      {/* Form Upload Bukti */}
      <PaymentForm teamId={team.id} isFree={isFree} />
    </div>
  );
}
