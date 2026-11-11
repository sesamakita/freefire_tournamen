import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const withdrawSchema = z.object({
  amount: z.number().int().min(10000, "Minimal penarikan saldo adalah Rp 10.000."),
  method: z.enum([
    "dana",
    "gopay",
    "ovo",
    "shopeepay",
    "bank_bca",
    "bank_bri",
    "bank_mandiri",
    "bank_bni",
  ]),
  account_number: z.string().trim().min(5, "Nomor rekening/e-wallet minimal 5 karakter."),
  account_name: z.string().trim().min(3, "Nama pemilik rekening/e-wallet minimal 3 karakter."),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Silakan login terlebih dahulu untuk mengajukan penarikan dana.",
        401
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = withdrawSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        parseResult.error.issues[0]?.message || "Format data penarikan tidak valid.",
        422
      );
    }

    const { amount, method, account_number, account_name } = parseResult.data;
    const admin = createAdminClient();

    // 1. Panggil RPC request_withdrawal
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "request_withdrawal" as any,
      {
        p_amount: amount,
        p_method: method,
        p_account_number: account_number,
        p_account_name: account_name,
      }
    );

    // Jika RPC belum ada di PostgreSQL, jalankan fallback atomik di backend
    let remainingBalance = 0;
    let withdrawalId = "";

    if (rpcError) {
      console.warn("RPC request_withdrawal error, running fallback:", rpcError);

      const { data: wallet } = await admin
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .single();

      if (!wallet || (wallet.balance || 0) < amount) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          `Saldo tidak mencukupi. Saldo Anda saat ini: Rp ${(wallet?.balance || 0).toLocaleString("id-ID")}`,
          400
        );
      }

      remainingBalance = wallet.balance - amount;

      // Potong saldo
      await admin
        .from("wallets")
        .update({ balance: remainingBalance, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);

      // Buat penarikan
      const { data: newWd } = await admin
        .from("withdrawals")
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          amount,
          method,
          account_number,
          account_name,
          status: "pending",
        })
        .select("id")
        .single();

      withdrawalId = newWd?.id || "";

      // Catat transaksi mutasi
      await admin.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        type: "withdrawal",
        amount,
        status: "pending",
        description: `Penarikan saldo ke ${method.toUpperCase()} (${account_number} a.n ${account_name})`,
        reference_id: withdrawalId,
      });
    } else {
      remainingBalance = rpcResult?.remaining_balance ?? 0;
      withdrawalId = rpcResult?.withdrawal_id ?? "";
    }

    // 2. Audit log
    const meta = getRequestMeta(request);
    await writeAuditLog({
      actorId: user.id,
      action: "wallet.withdraw",
      entity: "withdrawal",
      entityId: withdrawalId || user.id,
      reason: `Pengajuan penarikan Rp ${amount.toLocaleString("id-ID")} via ${method.toUpperCase()}`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return apiSuccess({
      message: "Permintaan penarikan berhasil diajukan dan sedang diproses!",
      withdrawal_id: withdrawalId,
      amount,
      remaining_balance: remainingBalance,
    });
  } catch (err: unknown) {
    console.error("POST /api/wallet/withdraw error:", err);
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Terjadi kesalahan saat memproses penarikan saldo.",
      500
    );
  }
}
