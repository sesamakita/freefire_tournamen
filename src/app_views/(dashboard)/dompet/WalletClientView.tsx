"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Smartphone,
  RefreshCw,
  Plus,
  ShieldCheck,
} from "lucide-react";

interface WalletClientViewProps {
  wallet: {
    id: string;
    balance: number;
    total_earned: number;
    total_withdrawn: number;
  };
  transactions: any[];
  withdrawals: any[];
}

const PAYMENT_METHODS = [
  { id: "dana", name: "DANA", type: "ewallet", icon: Smartphone },
  { id: "gopay", name: "GoPay", type: "ewallet", icon: Smartphone },
  { id: "ovo", name: "OVO", type: "ewallet", icon: Smartphone },
  { id: "shopeepay", name: "ShopeePay", type: "ewallet", icon: Smartphone },
  { id: "bank_bca", name: "Bank BCA", type: "bank", icon: Building2 },
  { id: "bank_bri", name: "Bank BRI", type: "bank", icon: Building2 },
  { id: "bank_mandiri", name: "Bank Mandiri", type: "bank", icon: Building2 },
  { id: "bank_bni", name: "Bank BNI", type: "bank", icon: Building2 },
];

export function WalletClientView({
  wallet,
  transactions,
  withdrawals,
}: WalletClientViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"transactions" | "withdrawals">("transactions");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Withdraw
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState("dana");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount < 10000) {
      toast.error("Minimal penarikan saldo adalah Rp 10.000.");
      return;
    }

    if (withdrawAmount > wallet.balance) {
      toast.error("Saldo aktif Anda tidak mencukupi untuk penarikan ini.");
      return;
    }

    if (!accountNumber.trim() || !accountName.trim()) {
      toast.error("Nomor dan nama pemilik akun wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: withdrawAmount,
          method,
          account_number: accountNumber.trim(),
          account_name: accountName.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Gagal mengajukan penarikan dana.");
        return;
      }

      toast.success("Permintaan penarikan berhasil diajukan!");
      setShowWithdrawModal(false);
      setAmount("");
      setAccountNumber("");
      setAccountName("");
      router.refresh();
    } catch (err) {
      console.error("Withdraw error:", err);
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPresetAmount = (val: number) => {
    if (val > wallet.balance) {
      setAmount(wallet.balance);
    } else {
      setAmount(val);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-amber-500" />
            Dompet Hadiah Turnamen
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kelola saldo kemenangan turnamen Free Fire dan ajukan penarikan ke e-wallet & rekening bank.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowWithdrawModal(true)}
          disabled={wallet.balance < 10000}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Tarik Dana (Withdraw)</span>
        </button>
      </div>

      {/* Saldo Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Saldo Aktif */}
        <div className="card-glow p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-zinc-950/80 to-zinc-950/90 relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              Saldo Aktif Tersedia
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold">
              Siap Ditarik
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Rp {wallet.balance.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-zinc-400">
            Dapat ditarik kapan saja ke DANA, GoPay, OVO, atau Rekening Bank.
          </p>
        </div>

        {/* Total Hadiah Dimenangkan */}
        <div className="card-glow p-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              Total Hadiah Dimenangkan
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold">
              Juara Turnamen
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Rp {wallet.total_earned.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-zinc-400">
            Akumulasi prize pool dari turnamen yang telah selesai dan diverifikasi.
          </p>
        </div>

        {/* Total Telah Dicairkan */}
        <div className="card-glow p-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" />
              Total Telah Dicairkan
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[10px] font-bold">
              Withdrawal Sukses
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Rp {wallet.total_withdrawn.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-zinc-400">
            Total dana yang telah berhasil ditransfer ke rekening / e-wallet Anda.
          </p>
        </div>
      </div>

      {/* Tabs Riwayat */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "transactions"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            Mutasi Transaksi ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdrawals")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "withdrawals"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            Riwayat Penarikan ({withdrawals.length})
          </button>
        </div>

        {/* Content Tab 1: Mutasi Transaksi */}
        {activeTab === "transactions" && (
          <div className="space-y-2.5">
            {transactions.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
                <Wallet className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400 font-semibold">Belum ada mutasi transaksi.</p>
                <p className="text-[11px] text-zinc-500">
                  Hadiah juara turnamen yang Anda menangkan akan otomatis muncul di sini.
                </p>
              </div>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.type === "prize_credit" || tx.type === "refund";
                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-white">{tx.description}</p>
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(tx.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            WIB
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isCredit ? "text-emerald-400" : "text-zinc-300"
                        }`}
                      >
                        {isCredit ? "+" : "-"} Rp {Number(tx.amount).toLocaleString("id-ID")}
                      </span>
                      <p className="text-[10px] text-zinc-500 capitalize">{tx.status}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Content Tab 2: Riwayat Penarikan (Withdrawals) */}
        {activeTab === "withdrawals" && (
          <div className="space-y-2.5">
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
                <ArrowUpRight className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400 font-semibold">Belum ada pengajuan penarikan dana.</p>
                <p className="text-[11px] text-zinc-500">
                  Ajukan penarikan saldo Anda dengan tombol &quot;Tarik Dana&quot; di atas.
                </p>
              </div>
            ) : (
              withdrawals.map((w) => {
                const statusColors = {
                  pending: "bg-amber-500/15 border-amber-500/30 text-amber-400",
                  processing: "bg-blue-500/15 border-blue-500/30 text-blue-400",
                  completed: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
                  rejected: "bg-red-500/15 border-red-500/30 text-red-400",
                };

                return (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                          {w.method.replace("_", " ")}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${
                            statusColors[w.status as keyof typeof statusColors] || "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {w.status === "pending"
                            ? "Menunggu Verifikasi"
                            : w.status === "processing"
                            ? "Sedang Ditransfer"
                            : w.status === "completed"
                            ? "Berhasil Ditransfer"
                            : "Ditolak"}
                        </span>
                      </div>
                      <p className="text-zinc-300">
                        {w.account_number} &bull; a.n <span className="font-semibold text-white">{w.account_name}</span>
                      </p>
                      {w.admin_notes && (
                        <p className="text-[11px] text-red-400 italic">Catatan Admin: {w.admin_notes}</p>
                      )}
                      <p className="text-[10px] text-zinc-500">
                        Diajukan pada{" "}
                        {new Date(w.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        WIB
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <span className="font-mono text-base font-black text-amber-400">
                        Rp {Number(w.amount).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal Tarik Saldo (Withdraw) */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base text-white font-bold flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-amber-500" />
                  Tarik Saldo Kemenangan
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Saldo Tersedia: <strong className="text-white">Rp {wallet.balance.toLocaleString("id-ID")}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
              {/* Pilihan Metode */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Tujuan Penarikan *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = method === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setMethod(pm.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <pm.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{pm.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Nominal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-semibold">Nominal Penarikan (Rp) *</label>
                  <span className="text-[11px] text-zinc-500">Min. Rp 10.000</span>
                </div>
                <input
                  type="number"
                  min={10000}
                  max={wallet.balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? parseInt(e.target.value, 10) : "")}
                  placeholder="Contoh: 50000"
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono text-sm"
                  required
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setPresetAmount(50000)}
                    className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                  >
                    50 Ribu
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(100000)}
                    className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                  >
                    100 Ribu
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(wallet.balance)}
                    className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 font-bold text-[10px]"
                  >
                    Semua ({wallet.balance.toLocaleString("id-ID")})
                  </button>
                </div>
              </div>

              {/* Nomor Akun / Rekening */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Nomor HP E-Wallet / Nomor Rekening Bank *
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Contoh: 08123456789 atau 1234567890"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono"
                  required
                />
              </div>

              {/* Nama Pemilik */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Nama Pemilik Rekening / Akun *
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Harus sesuai nama terdaftar di e-wallet/bank"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100"
                  required
                />
                <p className="text-[10px] text-zinc-500 mt-1 italic">
                  ⚠️ Pastikan nama dan nomor rekening sesuai untuk menghindari penolakan transfer otomatis.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Number(amount) < 10000 || Number(amount) > wallet.balance}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Kirim Pengajuan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
