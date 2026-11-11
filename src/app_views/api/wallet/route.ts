import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, ERROR_CODES } from "@/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(
        ERROR_CODES.FORBIDDEN_ROLE,
        "Silakan login terlebih dahulu untuk mengakses dompet.",
        401
      );
    }

    const admin = createAdminClient();

    // 1. Ambil atau inisialisasi dompet pengguna
    let { data: wallet, error: walletError } = await admin
      .from("wallets")
      .select("id, user_id, balance, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet, error: createError } = await admin
        .from("wallets")
        .insert({ user_id: user.id, balance: 0 })
        .select("id, user_id, balance, created_at, updated_at")
        .single();

      if (createError) {
        return apiError(ERROR_CODES.INTERNAL_ERROR, "Gagal menginisialisasi dompet.", 500);
      }
      wallet = newWallet;
    }

    // 2. Ambil riwayat mutasi transaksi
    const { data: transactions } = await admin
      .from("wallet_transactions")
      .select("id, type, amount, status, description, reference_id, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(30);

    // 3. Ambil riwayat pengajuan penarikan
    const { data: withdrawals } = await admin
      .from("withdrawals")
      .select("id, amount, method, account_number, account_name, status, admin_notes, disbursed_at, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Hitung ringkasan
    const totalPrizeEarned = (transactions || [])
      .filter((t) => t.type === "prize_credit" && t.status === "completed")
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const totalWithdrawn = (withdrawals || [])
      .filter((w) => w.status === "completed")
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return apiSuccess({
      wallet: {
        id: wallet.id,
        balance: Number(wallet.balance || 0),
        total_earned: totalPrizeEarned,
        total_withdrawn: totalWithdrawn,
      },
      transactions: transactions || [],
      withdrawals: withdrawals || [],
    });
  } catch (err: unknown) {
    console.error("GET /api/wallet error:", err);
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Terjadi kesalahan saat memuat data dompet.",
      500
    );
  }
}
