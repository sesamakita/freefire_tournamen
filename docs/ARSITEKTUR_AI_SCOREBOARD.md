# Arsitektur — AI Bantu Baca Scoreboard

| Field | Isi |
|---|---|
| **Nama Dokumen** | Arsitektur Fitur AI Pre-fill Scoreboard |
| **Versi** | 1.0 (Draft) |
| **Status** | Usulan — belum diimplementasikan |
| **Referensi** | `TDD_PLATFORM_LOMBA_FREEFIRE.md` v1.0 |
| **Audiens** | Pemilik produk, panitia turnamen, engineer |

---

## 0. Ringkasan Satu Paragraf

Saat panitia mengunggah screenshot scoreboard, **AI membaca gambar itu dan mengisi formulir skor secara otomatis**. Panitia tinggal memeriksa, mengoreksi kalau ada yang salah, lalu submit seperti biasa. **AI tidak pernah menyimpan apa pun sendiri** — ia hanya mengetikkan angka ke formulir yang tetap harus ditekan tombolnya oleh manusia.

Analogi: AI adalah **juru tulis**, bukan **wasit**. Juru tulis menyalin angka dari papan ke buku. Kalau salah salin, wasit (panitia) yang menegur. Keputusan tetap milik wasit.

---

## 1. Masalah yang Diselesaikan

| Sekarang (manual) | Dengan AI |
|---|---|
| Panitia mengetik 12 baris × 6 match = **72 baris** | AI isi otomatis, panitia cek |
| Rata-rata 8–12 menit per match | Rata-rata 2–3 menit per match |
| Salah ketik tidak terdeteksi | Validasi silang menangkap |
| Screenshot hanya jadi arsip | Screenshot jadi sumber data |

**Yang TIDAK berubah:** aturan dual control, approval manual, dan audit log. Semua tetap.

---

## 2. Alur Lengkap — Dari Upload sampai Klasemen

```
┌──────────────────────────────────────────────────────────────────────┐
│  LANGKAH 1 — PANITIA UPLOAD SCREENSHOT                               │
│  Halaman: /admin/[tournamentId]/skor                                 │
│                                                                      │
│  Panitia pilih match → pilih file screenshot → [Upload]              │
│                                                                      │
│  Yang terjadi: file masuk ke Supabase Storage (bucket `screenshots`)  │
│  Hasil: sebuah URL publik, contoh:                                   │
│  https://xxx.supabase.co/storage/v1/.../match_12_1712.png            │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LANGKAH 2 — SISTEM MINTA AI MEMBACA                                 │
│  Endpoint BARU: POST /api/ai/read-scoreboard                         │
│                                                                      │
│  Input : { screenshot_url, jumlah_tim, daftar_nama_tim }             │
│  Proses: server kirim URL gambar + instruksi ke model AI vision      │
│  Output: JSON terstruktur (lihat §4)                                 │
│                                                                      │
│  ⚠️ Kunci API AI disimpan di server. Tidak pernah ke browser.        │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LANGKAH 3 — VALIDASI SILANG (Gerbang Keamanan)                      │
│  Fungsi BARU: validasiHasilAI()  ← ini yang mencegah AI ngawur       │
│                                                                      │
│  ✅ Placement harus unik 1..N                                        │
│  ✅ Jumlah baris = jumlah tim di match                               │
│  ✅ Total kill ≤ jumlah pemain (tim × 4)                             │
│  ✅ Kill per tim ≤ jumlah pemain lawan                               │
│  ✅ Nama tim hasil baca cocok dengan daftar tim asli (fuzzy match)   │
│                                                                      │
│  Gagal salah satu? → AI DIBATALKAN, form tetap kosong (manual)       │
│  Lulus semua?    → lanjut ke Langkah 4                               │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LANGKAH 4 — FORM TERISI OTOMATIS (Manusia Memeriksa)                │
│                                                                      │
│  Layar terbelah dua:                                                 │
│  ┌────────────────────┬───────────────────────┐                      │
│  │  SCREENSHOT ASLI   │  FORM TERISI AI       │                      │
│  │  (bisa di-zoom)    │  Rank 1: Tim A  8 kill│  ← angka AI diberi   │
│  │                    │  Rank 2: Tim B  5 kill│    warna kuning +     │
│  │                    │  Rank 3: Tim C  3 kill│    label "dari AI"    │
│  └────────────────────┴───────────────────────┘                      │
│                                                                      │
│  Panitia bisa mengubah angka mana pun.                               │
│  Ada badge: "🤖 12 baris terisi AI — mohon periksa"                  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LANGKAH 5 — SUBMIT (Alur LAMA, tidak berubah)                       │
│  POST /api/tournaments/[id]/matches/[matchId]/results                │
│                                                                      │
│  Trigger Postgres calculate_points() menghitung poin otomatis        │
│  Status hasil: `pending`                                             │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LANGKAH 6 — APPROVAL (Alur LAMA, dual control tetap)                │
│  POST .../results/verify                                             │
│                                                                      │
│  Harus admin LAIN (bukan yang input)                                 │
│  Status: `pending` → `approved`                                      │
│  → point_config terkunci (trigger lock_point_config)                 │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LANGKAH 7 — KLASEMEN UPDATE OTOMATIS                                │
│  View `standings` menghitung ulang on-the-fly                        │
│  Publik lihat di /t/[slug]/klasemen                                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Perubahan per Lapisan

| Lapisan | Berubah? | Detail |
|---|---|---|
| **Database (schema)** | ❌ Tidak | Tidak ada tabel/kolom baru |
| **Trigger poin** | ❌ Tidak | `calculate_points()` tetap |
| **View standings** | ❌ Tidak | Tetap hitung on-the-fly |
| **API results (submit)** | ❌ Tidak | Menerima JSON yang sama |
| **API verify** | ❌ Tidak | Dual control tetap |
| **Endpoint AI** | ✅ **BARU** | `/api/ai/read-scoreboard` |
| **Fungsi validasi AI** | ✅ **BARU** | `validasiHasilAI()` di `src/lib/ai/` |
| **UI form skor** | ⚠️ Diperluas | Tambah tombol "Baca dengan AI" + badge sumber |
| **Dependensi** | ✅ **BARU** | SDK provider AI (1 paket) |
| **Env var** | ✅ **BARU** | `AI_API_KEY` (server-only) |

**Kesimpulan penting:** ini fitur **aditif**. Tidak menyentuh satu pun logika yang sudah terbukti jalan. Kalau AI dimatikan, sistem kembali persis seperti sekarang.

---

## 4. Kontrak Data AI

AI **wajib** mengembalikan JSON dengan bentuk ini. Kalau tidak sesuai, hasilnya dibuang.

```json
{
  "confidence": 0.87,
  "teams": [
    { "rank": 1, "nama_tim": "EVOS DIVINE", "kills": 8, "terbaca": true },
    { "rank": 2, "nama_tim": "BIGETRON",    "kills": 5, "terbaca": true },
    { "rank": 3, "nama_tim": "ONIC",        "kills": 3, "terbaca": false }
  ],
  "catatan": "Rank 3 angka kill tertutup ikon notifikasi"
}
```

| Field | Arti | Dipakai untuk |
|---|---|---|
| `confidence` | Keyakinan AI 0–1 | < 0.7 → tampilkan peringatan merah |
| `nama_tim` | Nama tim terbaca | Dicocokkan ke daftar tim asli |
| `kills` | Jumlah kill | Diisi ke form |
| `terbaca` | Apakah sel ini jelas | `false` → sel dikosongkan, panitia isi manual |
| `catatan` | Alasan ragu | Ditampilkan sebagai tooltip |

**Field `terbaca` dan `catatan` adalah kuncinya.** AI dipaksa mengakui ketidakpastiannya, bukan menebak diam-diam.

---

## 5. Gerbang Keamanan — Kenapa AI Tidak Bisa Merusak Klasemen

Ini bagian terpenting dokumen ini. AI salah baca **pasti terjadi**. Yang membuatnya aman adalah 5 lapis ini:

```
Lapis 1  AI tidak punya akses tulis ke database
         → hanya mengembalikan JSON ke browser
              ↓
Lapis 2  Validasi silang menolak hasil mustahil
         → placement ganda? total kill > 48? → buang
              ↓
Lapis 3  Panitia melihat screenshot & form berdampingan
         → mata manusia adalah pemeriksa terakhir sebelum submit
              ↓
Lapis 4  Status hasil = `pending`, bukan `approved`
         → belum masuk klasemen
              ↓
Lapis 5  Admin LAIN harus approve (dual control)
         → satu orang tidak bisa menipu sendirian
```

**Satu baris yang bisa dipegang:** AI hanya menyentuh **nilai di dalam kotak input HTML**. Ia tidak pernah menyentuh database.

---

## 6. Skenario Kegagalan & Perilakunya

| Skenario | Perilaku sistem | Dampak ke pengguna |
|---|---|---|
| AI API down / timeout | Form tetap kosong, pakai manual | Tidak ada — fitur tambahan saja |
| AI balas JSON ngawur | Validasi tolak, form kosong | Tidak ada |
| AI baca 10 dari 12 tim | Validasi tolak (jumlah tidak cocok) | Tidak ada |
| AI baca kill 60 | Validasi tolak (mustahil) | Tidak ada |
| AI salah baca 8 jadi 6 | **Lolos validasi** | Panitia harus menangkap saat cek |
| Screenshot gelap/blur | `confidence` rendah → peringatan | Panitia isi manual |
| Nama tim beda ejaan | Fuzzy match gagal → sel kosong | Panitia pilih dari dropdown |

**Baris yang perlu diperhatikan:** "AI salah baca 8 jadi 6 — lolos validasi". Ini **tidak bisa** dicegah sistem sepenuhnya. Karena itu Langkah 4 (manusia memeriksa) bukan opsional — itu bagian dari desain, bukan formalitas.

---

## 7. Rencana Bertahap (Supaya Bisa Berhenti Kapan Saja)

| Tahap | Isi | Bisa dipakai? | Effort |
|---|---|---|---|
| **T0 — Uji Kelayakan** | Kirim 1 screenshot asli, ukur akurasi manual | Belum | 15 menit |
| **T1 — Endpoint AI** | `/api/ai/read-scoreboard` + prompt + parsing | Belum (API saja) | 1 sesi |
| **T2 — Validasi** | `validasiHasilAI()` + unit test | Belum | 1 sesi |
| **T3 — UI** | Tombol "Baca dengan AI" + badge + layar belah | **Ya** | 1–2 sesi |
| **T4 — Audit** | Catat di `audit_log` bahwa AI dipakai | Ya | 30 menit |

**T0 adalah gerbangnya.** Kalau akurasi di T0 buruk, hentikan di situ — tidak ada kode yang terlanjur ditulis.

---

## 8. Yang Harus Diputuskan Sebelum Mulai

| # | Pertanyaan | Pilihan | Dampak |
|---|---|---|---|
| 1 | Provider AI? | Gemini Flash / GPT-4o-mini / Claude Haiku | Biaya & akurasi sedikit beda |
| 2 | Auto-isi atau tombol manual? | Tombol (disarankan) / otomatis saat upload | Tombol = panitia tetap punya kendali |
| 3 | Kalau AI gagal, form kosong atau sebagian? | Kosong semua (disarankan) / isi yang yakin saja | Kosong = tidak ada data campuran |
| 4 | Simpan riwayat AI di audit log? | Ya (disarankan) / tidak | Ya = bisa telusuri kalau ada sengketa |
| 5 | Batasi hanya untuk role tertentu? | owner+admin / semua staff | Semua staff = panitia bisa pakai |

---

## 9. Batasan yang Harus Diakui

1. **Akurasi belum terukur.** Belum ada screenshot asli yang diuji. Angka akurasi apa pun sebelum T0 adalah tebakan.
2. **Tidak ada API resmi Free Fire.** Screenshot tetap satu-satunya sumber. AI tidak mengubah fakta ini.
3. **AI tidak bisa memutuskan sengketa.** Kalau dua tim klaim hasil beda, tetap manusia yang putuskan lewat `disputes`.
4. **Biaya bukan masalah, kepercayaan adalah.** ~Rp 500 per turnamen. Yang mahal adalah reputasi kalau klasemen salah.
5. **Bukan pengganti dual control.** Justru memperkuat alasan dual control tetap ada.
