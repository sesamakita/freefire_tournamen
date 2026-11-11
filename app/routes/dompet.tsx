import { redirect, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createWebClient } from "@/lib/supabase/web";
import { createAdminClient } from "@/lib/supabase/admin";
import { WalletClientView } from "@/app/(dashboard)/dompet/WalletClientView";

export function meta() {
  return [
    { title: "Dompet Hadiah Turnamen — Arena Tempur" },
    { name: "description", content: "Kelola saldo kemenangan turnamen komunitas dan ajukan penarikan ke e-wallet & rekening bank." },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { client: supabase } = createWebClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/login");
  }

  const admin = createAdminClient();

  // 1. Ambil atau inisialisasi dompet pengguna
  let { data: wallet } = await admin
    .from("wallets")
    .select("id, balance, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!wallet) {
    const { data: newWallet } = await admin
      .from("wallets")
      .insert({ user_id: user.id, balance: 0 })
      .select("id, balance, created_at, updated_at")
      .single();
    wallet = newWallet;
  }

  // 2. Ambil transaksi & withdrawals
  const { data: transactions } = await admin
    .from("wallet_transactions")
    .select("id, type, amount, status, description, reference_id, created_at")
    .eq("wallet_id", wallet?.id || "")
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: withdrawals } = await admin
    .from("withdrawals")
    .select("id, amount, method, account_number, account_name, status, admin_notes, disbursed_at, created_at")
    .eq("wallet_id", wallet?.id || "")
    .order("created_at", { ascending: false })
    .limit(20);

  const totalPrizeEarned = (transactions || [])
    .filter((t) => t.type === "prize_credit" && t.status === "completed")
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalWithdrawn = (withdrawals || [])
    .filter((w) => w.status === "completed")
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return {
    wallet: {
      id: wallet?.id || "",
      balance: Number(wallet?.balance || 0),
      total_earned: totalPrizeEarned,
      total_withdrawn: totalWithdrawn,
    },
    transactions: transactions || [],
    withdrawals: withdrawals || [],
  };
}

export default function DompetRoute() {
  const { wallet, transactions, withdrawals } = useLoaderData<typeof loader>();

  return (
    <WalletClientView
      wallet={wallet}
      transactions={transactions}
      withdrawals={withdrawals}
    />
  );
}
