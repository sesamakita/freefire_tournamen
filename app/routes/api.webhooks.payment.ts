import type { ActionFunctionArgs } from "react-router";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { writeAuditLog } from "@/lib/audit";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return Response.json(
        { error: "Payload tidak lengkap" },
        { status: 400 }
      );
    }

    // 1. Verifikasi keamanan signature Midtrans
    const isValid = verifyMidtransSignature({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      signatureKey: signature_key,
    });

    if (!isValid) {
      console.warn("⚠️ Midtrans Webhook: Signature TIDAK VALID untuk order_id:", order_id);
      return Response.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // 2. Cari tim berdasarkan order_id yang tersimpan
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, nama, tournament_id, verification_status")
      .ilike("payment_proof_url", `%${order_id}%`)
      .single();

    if (teamErr || !team) {
      console.warn("⚠️ Midtrans Webhook: Tim tidak ditemukan untuk order_id:", order_id);
      // Tetap kembalikan 200 agar Midtrans tidak mencoba retry terus menerus
      return Response.json({ status: "Team not found, acknowledged" });
    }

    // 3. Tangani status transaksi pembayaran
    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (isSuccess) {
      // Pembayaran BERHASIL: Otomatis setujui tim
      await admin
        .from("teams")
        .update({
          verification_status: "approved",
          payment_proof_url: `MIDTRANS_SETTLED:${order_id}`,
        })
        .eq("id", team.id);

      // Catat ke Audit Trail
      await writeAuditLog({
        tournamentId: team.tournament_id,
        actorId: "00000000-0000-0000-0000-000000000000",
        action: "payment.verify",
        entity: "teams",
        entityId: team.id,
        before: { verification_status: team.verification_status },
        after: {
          verification_status: "approved",
          payment_provider: "midtrans_qris",
          order_id,
          gross_amount,
        },
        reason: "Auto-approved via Midtrans QRIS Webhook",
      });

      console.log(`✅ [MIDTRANS QRIS AUTO-SETTLE] Tim "${team.nama}" (${team.id}) berhasil disetujui otomatis!`);
    } else if (
      transaction_status === "expire" ||
      transaction_status === "cancel" ||
      transaction_status === "deny"
    ) {
      // Pembayaran Kedaluwarsa / Batal: Kembalikan status ke draft
      if (team.verification_status === "pending") {
        await admin
          .from("teams")
          .update({
            verification_status: "draft",
            payment_proof_url: null,
          })
          .eq("id", team.id);

        console.log(`❌ [MIDTRANS QRIS EXPIRED] Tagihan tim "${team.nama}" kedaluwarsa.`);
      }
    }

    return Response.json({ status: "OK", transaction_status });
  } catch (err: any) {
    console.error("Midtrans Webhook Error:", err);
    return Response.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}
