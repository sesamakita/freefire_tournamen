-- ==============================================================================
-- MIGRATION: 20261102_prize_pool_and_wallet.sql
-- TUJUAN: Sistem Distribusi Hadiah (Prize Pool) & Dompet Pengguna (Wallet)
-- Mendukung pengesahan otomatis juara turnamen, kredit saldo instan ke dompet kapten,
-- serta antrean penarikan dana (Withdrawal) ke DANA, GoPay, OVO, & Bank.
-- ==============================================================================

-- 1. Tambah kolom prize pool pada tabel tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS prize_pool BIGINT NOT NULL DEFAULT 0 CHECK (prize_pool >= 0),
  ADD COLUMN IF NOT EXISTS prize_distribution JSONB NOT NULL DEFAULT '{"1": 0.5, "2": 0.3, "3": 0.2}',
  ADD COLUMN IF NOT EXISTS prizes_disbursed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Buat tabel Dompet Pengguna (wallets)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

-- 3. Buat tabel Buku Besar Mutasi Dompet (wallet_transactions)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('prize_credit', 'withdrawal', 'refund', 'adjustment')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_tournament ON public.wallet_transactions(tournament_id);

-- 4. Buat tabel Permintaan Penarikan Dana (withdrawals)
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount >= 10000),
  method TEXT NOT NULL CHECK (method IN ('dana', 'gopay', 'ovo', 'shopeepay', 'bank_bca', 'bank_bri', 'bank_mandiri', 'bank_bni')),
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  admin_notes TEXT,
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- 5. RLS Policies
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_owner_read" ON public.wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "wallet_transactions_owner_read" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wallets w 
      WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "withdrawals_owner_read" ON public.withdrawals
  FOR SELECT USING (user_id = auth.uid());

-- 6. RPC Atomik: Pengesahan & Distribusi Hadiah Juara (disburse_tournament_prizes)
CREATE OR REPLACE FUNCTION public.disburse_tournament_prizes(p_tournament_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id           UUID := auth.uid();
  v_tourney           RECORD;
  v_is_staff          BOOLEAN;
  v_rank_key          TEXT;
  v_ratio_or_amount   NUMERIC;
  v_prize_amount      BIGINT;
  v_standing          RECORD;
  v_kapten_id         UUID;
  v_wallet_id         UUID;
  v_disbursed_list    JSONB := '[]'::JSONB;
  v_rank_int          INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Silakan login terlebih dahulu';
  END IF;

  -- 1. Ambil data turnamen & kunci baris
  SELECT id, organizer_id, nama, prize_pool, prize_distribution, prizes_disbursed_at, status
  INTO v_tourney
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND: Turnamen tidak ditemukan';
  END IF;

  -- 2. Cek izin staf (Owner atau Admin turnamen)
  SELECT (v_tourney.organizer_id = v_user_id) OR EXISTS (
    SELECT 1 FROM public.tournament_staff
    WHERE tournament_id = p_tournament_id 
      AND user_id = v_user_id 
      AND role IN ('owner', 'admin')
  ) INTO v_is_staff;

  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'FORBIDDEN: Hanya owner atau admin yang berhak membagikan hadiah turnamen';
  END IF;

  -- 3. Idempotensi: Cek apakah hadiah sudah pernah dibagikan
  IF v_tourney.prizes_disbursed_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_DISBURSED: Hadiah untuk turnamen ini sudah pernah didistribusikan pada %',
      to_char(v_tourney.prizes_disbursed_at, 'YYYY-MM-DD HH24:MI:SS');
  END IF;

  IF v_tourney.prize_pool <= 0 THEN
    RAISE EXCEPTION 'ZERO_PRIZE_POOL: Total hadiah turnamen bernilai 0, tidak ada hadiah untuk dibagikan';
  END IF;

  -- 4. Iterasi skema distribusi hadiah
  FOR v_rank_key IN SELECT * FROM jsonb_object_keys(v_tourney.prize_distribution)
  LOOP
    v_rank_int := v_rank_key::INT;
    v_ratio_or_amount := (v_tourney.prize_distribution->>v_rank_key)::NUMERIC;

    -- Tentukan nominal hadiah (bisa berupa desimal rasio 0.50 atau nominal tetap)
    IF v_ratio_or_amount <= 1.0 THEN
      v_prize_amount := ROUND(v_tourney.prize_pool * v_ratio_or_amount)::BIGINT;
    ELSE
      v_prize_amount := ROUND(v_ratio_or_amount)::BIGINT;
    END IF;

    -- Ambil tim peringkat ke-v_rank_int dari View standings
    SELECT team_id, team_nama, rank
    INTO v_standing
    FROM public.standings
    WHERE tournament_id = p_tournament_id AND rank = v_rank_int
    LIMIT 1;

    IF FOUND AND v_prize_amount > 0 THEN
      -- Ambil kapten tim pemenang
      SELECT kapten_user_id INTO v_kapten_id
      FROM public.teams
      WHERE id = v_standing.team_id;

      IF v_kapten_id IS NOT NULL THEN
        -- Pastikan wallet kapten tersedia
        INSERT INTO public.wallets (user_id, balance)
        VALUES (v_kapten_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        -- Kreditkan hadiah ke wallet kapten
        UPDATE public.wallets
        SET balance = balance + v_prize_amount,
            updated_at = NOW()
        WHERE user_id = v_kapten_id
        RETURNING id INTO v_wallet_id;

        -- Catat transaksi buku besar
        INSERT INTO public.wallet_transactions (
          wallet_id,
          tournament_id,
          team_id,
          type,
          amount,
          status,
          description
        ) VALUES (
          v_wallet_id,
          p_tournament_id,
          v_standing.team_id,
          'prize_credit',
          v_prize_amount,
          'completed',
          'Hadiah Juara ' || v_rank_key || ' - Turnamen: ' || v_tourney.nama
        );

        -- Tambahkan ke daftar laporan pengesahan
        v_disbursed_list := v_disbursed_list || jsonb_build_object(
          'rank', v_rank_int,
          'team_id', v_standing.team_id,
          'team_nama', v_standing.team_nama,
          'kapten_user_id', v_kapten_id,
          'prize_amount', v_prize_amount
        );
      END IF;
    END IF;
  END LOOP;

  -- 5. Kunci turnamen sebagai 'done' dan catat timestamp pengesahan
  UPDATE public.tournaments
  SET prizes_disbursed_at = NOW(),
      status = 'done'
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'tournament_id', p_tournament_id,
    'total_prize_pool', v_tourney.prize_pool,
    'winners', v_disbursed_list,
    'disbursed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC Atomik: Permintaan Penarikan Saldo Dompet (request_withdrawal)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount BIGINT,
  p_method TEXT,
  p_account_number TEXT,
  p_account_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_wallet         RECORD;
  v_withdrawal_id  UUID;
  v_now            TIMESTAMPTZ := NOW();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Silakan login terlebih dahulu';
  END IF;

  IF p_amount < 10000 THEN
    RAISE EXCEPTION 'MINIMUM_AMOUNT: Minimal penarikan saldo adalah Rp 10.000';
  END IF;

  -- Kunci baris dompet user untuk keamanan konkurensi
  SELECT id, user_id, balance
  INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Saldo dompet Anda tidak mencukupi (Tersedia: Rp %)', COALESCE(v_wallet.balance, 0);
  END IF;

  -- Potong saldo dompet
  UPDATE public.wallets
  SET balance = balance - p_amount,
      updated_at = v_now
  WHERE id = v_wallet.id;

  -- Buat tiket penarikan
  INSERT INTO public.withdrawals (
    user_id,
    wallet_id,
    amount,
    method,
    account_number,
    account_name,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_wallet.id,
    p_amount,
    p_method,
    p_account_number,
    p_account_name,
    'pending',
    v_now,
    v_now
  ) RETURNING id INTO v_withdrawal_id;

  -- Catat transaksi mutasi debit ke buku besar
  INSERT INTO public.wallet_transactions (
    wallet_id,
    type,
    amount,
    status,
    description,
    reference_id,
    created_at
  ) VALUES (
    v_wallet.id,
    'withdrawal',
    p_amount,
    'pending',
    'Penarikan saldo ke ' || UPPER(p_method) || ' (' || p_account_number || ' a.n ' || p_account_name || ')',
    v_withdrawal_id::TEXT,
    v_now
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'withdrawal_id', v_withdrawal_id,
    'amount', p_amount,
    'remaining_balance', v_wallet.balance - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berikan izin eksekusi RPC ke pengguna terautentikasi
GRANT EXECUTE ON FUNCTION public.disburse_tournament_prizes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(BIGINT, TEXT, TEXT, TEXT) TO authenticated;
