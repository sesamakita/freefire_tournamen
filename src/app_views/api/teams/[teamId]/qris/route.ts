import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMidtransQris } from "@/lib/midtrans";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized. Silakan login." } },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // 1. Ambil data tim
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, kapten_user_id, tournament_id, verification_status")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return NextResponse.json(
        { success: false, error: { message: "Tim tidak ditemukan." } },
        { status: 404 }
      );
    }

    // Pastikan user adalah kapten tim
    if (team.kapten_user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { message: "Hanya kapten yang dapat membuat tagihan pembayaran." } },
        { status: 403 }
      );
    }

    // Cek apakah tim sudah lunas
    if (team.verification_status === "approved") {
      return NextResponse.json(
        { success: false, error: { message: "Pendaftaran tim ini sudah terverifikasi lunas." } },
        { status: 400 }
      );
    }

    // 2. Ambil data turnamen
    const { data: tournament, error: tourErr } = await admin
      .from("tournaments")
      .select("id, nama, entry_fee")
      .eq("id", team.tournament_id)
      .single();

    if (tourErr || !tournament) {
      return NextResponse.json(
        { success: false, error: { message: "Turnamen tidak ditemukan." } },
        { status: 404 }
      );
    }

    const entryFee = tournament.entry_fee ?? 0;
    if (entryFee <= 0) {
      return NextResponse.json(
        { success: false, error: { message: "Turnamen ini gratis, tidak memerlukan QRIS." } },
        { status: 400 }
      );
    }

    // Ambil profile user untuk nama kapten & nomor WA
    const { data: profile } = await admin
      .from("users")
      .select("nama, no_wa")
      .eq("id", user.id)
      .single();

    // Generate Order ID unik: TEAM_<prefix>_<timestamp>
    const orderId = `TEAM_${team.id.replace(/-/g, "").slice(0, 10)}_${Date.now()}`;

    // Request Dynamic QRIS ke Midtrans
    const qrisData = await createMidtransQris({
      orderId,
      grossAmount: entryFee,
      teamName: team.nama,
      captainName: profile?.nama || user.email?.split("@")[0] || "Kapten",
      email: user.email || "kapten@arenatempur.id",
      phone: profile?.no_wa || "081234567890",
    });

    // Simpan orderId di tim sebagai pending payment
    await admin
      .from("teams")
      .update({
        payment_proof_url: `MIDTRANS_PENDING:${orderId}`,
        verification_status: "pending",
      })
      .eq("id", team.id);

    return NextResponse.json({
      success: true,
      data: qrisData,
    });
  } catch (err: any) {
    console.error("Create QRIS API Error:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Gagal membuat transaksi QRIS." } },
      { status: 500 }
    );
  }
}
