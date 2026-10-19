# Alur Lengkap Turnamen — Dari Buat sampai Juara

| Field | Isi |
|---|---|
| **Nama Dokumen** | Alur End-to-End Platform ArenaKu |
| **Versi** | 1.0 |
| **Status** | Deskripsi sistem **yang berjalan sekarang** |
| **Sumber** | Dibaca langsung dari kode (`src/app/api/**`, `supabase/schema_sql_editor.sql`) |
| **Audiens** | Pemilik produk, panitia, engineer baru |

---

## 0. Siapa Saja yang Terlibat

| Peran | Sebutan | Yang dia lakukan |
|---|---|---|
| **Pemilik** | owner | Buat turnamen, atur poin, pegang kendali penuh |
| **Admin** | admin | Sama seperti owner, kecuali beberapa hal sensitif |
| **Panitia** | panitia | Verifikasi tim, atur jadwal, isi skor |
| **Kapten** | peserta | Daftarkan tim, isi roster, bayar, ambil Room ID |
| **Anggota** | peserta | Lihat jadwal, ambil Room ID |
| **Publik** | siapa saja | Lihat klasemen & jadwal tanpa login |

**Aturan kunci:** satu turnamen bisa punya banyak staff (`tournament_staff`), dan **orang yang mengisi skor tidak boleh menyetujui skornya sendiri**.

---

## 1. Peta Besar — 11 Fase (0–10)

```
 FASE 0        FASE 1        FASE 2        FASE 3        FASE 4
 Buat          Tim           Lengkapi      Bayar         Verifikasi
 Turnamen      Daftar        Roster        4 inti        Panitia
    │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
 ┌──────┐     ┌──────┐     ┌──────┐     ┌───────┐    ┌────────┐
 │ open │────▶│ draft│────▶│ draft│────▶│pending│───▶│approved│
 └──────┘     └──────┘     └──────┘     └───────┘    └────────┘
                                                           │
 FASE 5        FASE 6        FASE 7        FASE 8        │
 Buat Match    Room ID       Match         Isi Skor      │
 + Slotting    T-15 menit    Berjalan      (pending)     │
    │             │             │             │          │
    ▼             ▼             ▼             ▼          ▼
 ┌─────────┐  ┌────────┐   ┌─────────┐  ┌─────────┐  ┌────────┐
 │scheduled│─▶│ongoing │──▶│(selesai │─▶│ pending │─▶│ JUARA  │
 └─────────┘  └────────┘   │ tdk ada)│  └─────────┘  └────────┘
                           └─────────┘        │
 FASE 9          FASE 10                       ▼
 Approve         Klasemen              ┌─────────────┐
 (admin lain)    (publik)              │  KLASEMEN   │
    │                                  │  (publik)   │
    └─────────────────────────────────▶└─────────────┘
```

**Baca begini:** baris atas = perjalanan **tim** (dari daftar sampai jadi peserta sah). Baris bawah = perjalanan **match** (dari dibuat sampai hasilnya sah). Keduanya bertemu di klasemen.

---
## 2. FASE 0 — Panitia Membuat Turnamen

**Halaman:** `/admin/turnamen/buat` · **API:** `POST /api/tournaments`

| Langkah | Yang diisi panitia | Yang terjadi di sistem |
|---|---|---|
| 1 | Nama turnamen | — |
| 2 | Slug (alamat URL) | Dicek unik; bentrok → ditolak |
| 3 | Biaya masuk (`entry_fee`) | `0` = gratis, `>0` = wajib bayar |
| 4 | Kuota tim (`max_teams`) | Batas pendaftaran |
| 5 | Tanggal mulai & selesai | — |
| 6 | Logo | Opsional |
| 7 | Tekan **Buat** | Turnamen dibuat **langsung `status = open`** |

**Yang otomatis terjadi:**
1. Pembuat otomatis jadi `owner` di `tournament_staff`
2. `point_config` dibuat dengan poin default (juara 12, kill 1, dst.)
3. Audit log mencatat `tournament.status_change`

> ⚠️ **Catatan penting:** turnamen langsung `open` — tidak ada tahap `draft` yang bisa diedit dulu. Begitu dibuat, tim sudah bisa mendaftar.

---

## 3. FASE 1 — Tim Mendaftar

**Halaman:** `/tim/buat` · **API:** `POST /api/teams`

**Syarat:** turnamen harus `status = open`. Kalau tidak → ditolak.

### Urutan pemeriksaan (semua harus lulus)

```
1. User sudah login?                    → tidak → 401
2. Turnamen status 'open'?              → tidak → 409 "Pendaftaran belum dibuka"
3. User sudah jadi kapten di sini?      → ya    → 409 "Sudah terdaftar sebagai kapten"
4. Nama tim sudah dipakai?              → ya    → 409 "Nama tim sudah dipakai"
5. UID kapten sudah dipakai tim lain?   → ya    → 409 "UID sudah terdaftar"
        ↓ semua lulus
   BUAT TIM (verification_status = 'draft')
        ↓
   KAPTEN OTOMATIS MASUK ROSTER (anggota inti ke-1)
        ↓
   AUDIT LOG: roster.update
```

### Status awal tim

| Kondisi | `payment_status` | `verification_status` |
|---|---|---|
| Turnamen **gratis** (`entry_fee = 0`) | `verified` | `draft` |
| Turnamen **berbayar** | `unpaid` | `draft` |

**Kenapa `draft`?** Karena roster belum lengkap. Tim belum dianggap peserta sah sampai Fase 3 & 4 selesai.

---

## 4. FASE 2 — Kapten Melengkapi Roster

**Halaman:** `/tim/[teamId]/roster`

| Aturan | Nilai |
|---|---|
| Minimal anggota inti | **4 orang** |
| Maksimal anggota inti | 4 orang |
| Cadangan (substitute) | Boleh, tidak dihitung inti |
| Peran | rusher / sniper / support / igl / cadangan |
| UID ganda dalam satu turnamen | Ditolak |

Kapten mengisi IGN + UID tiap anggota. **UID adalah kunci** — satu UID tidak boleh muncul di dua tim pada turnamen yang sama.

**Status tetap `draft`** sampai kapten menekan submit pembayaran.

---

## 5. FASE 3 & 4 — Bayar lalu Masuk Antrean Verifikasi

**Halaman:** `/tim/[teamId]/bayar` · **API:** `POST /api/teams/[teamId]/payment`

### Gerbang sebelum boleh bayar

```
1. Yang menekan harus KAPTEN          → bukan → 403
2. Roster inti sudah ≥ 4 orang?       → kurang → 422 "Minimal 4 anggota inti"
3. Upload bukti transfer (QRIS)       → kosong → 400
        ↓ lulus
   payment_status      : unpaid    → submitted
   verification_status : draft     → pending   ← masuk antrean panitia
        ↓
   AUDIT LOG: payment.verify
```

> **Perhatikan:** status berubah jadi `pending` **bukan** `approved`. Tim belum sah jadi peserta. Ini yang mencegah tim "nyelip" tanpa diperiksa.

---

## 6. FASE 5 — Panitia Memverifikasi Tim

**Halaman:** `/admin/[tournamentId]/verifikasi` · **API:** `POST /api/tournaments/[id]/teams/[teamId]/verify`

Panitia melihat daftar tim berstatus `pending`, mencocokkan bukti transfer, lalu memilih:

| Aksi | Syarat | Hasil |
|---|---|---|
| **Setujui** | staff turnamen | `verification_status = approved`, `payment_status = verified` |
| **Tolak** | alasan **minimal 10 karakter** | `verification_status = rejected`, alasan disimpan |

Keduanya mencatat `verified_by` + `verified_at` dan menulis audit log (`team.approve` / `team.reject`).

**Setelah disetujui → tim resmi jadi peserta.** Inilah titik di mana tim boleh dimasukkan ke match.

---

## 7. FASE 6 — Panitia Membuat Match & Menempatkan Tim

**Halaman:** `/admin/[tournamentId]/match` · **API:** `POST /api/tournaments/[id]/matches`

### 7a. Buat match

| Field | Isi |
|---|---|
| `nama` | Misal "Match 1 — Bermuda" |
| `round` | Babak ke berapa |
| `grup` | Opsional (belum dipakai di klasemen) |
| `jadwal` | Tanggal & jam → **penting untuk Room ID** |

Status match otomatis `scheduled`, langsung `published_at` (tampil ke publik).

### 7b. Tempatkan tim (slotting)

**API:** `POST /api/tournaments/[id]/matches/[matchId]/slots`

```
1. Hapus semua slot lama di match ini
2. Masukkan slot baru: { team_id, slot }
```

> ⚠️ **Celah yang perlu Anda tahu:** endpoint ini **tidak memeriksa** apakah tim sudah `approved`. Secara teknis, tim yang belum diverifikasi bisa dimasukkan ke match lewat API. Lewat UI kemungkinan hanya tim approved yang muncul — tapi aturannya tidak ditegakkan di server.

---

## 8. FASE 7 — Room ID Dibagikan (T-15 Menit)

**API:** `GET /api/tournaments/[id]/matches/[matchId]/room`

### Siapa yang boleh lihat

| Siapa | Boleh? | Syarat |
|---|---|---|
| Staff (owner/admin/panitia) | ✅ | Kapan saja |
| Kapten tim peserta match | ✅ | **Hanya mulai T-15 menit** |
| Anggota tim peserta match | ✅ | **Hanya mulai T-15 menit** |
| Tim lain / publik | ❌ | 403 |

### Time-gating

```
jadwal match = 20:00
sekarang      = 19:40  → DITOLAK, muncul hitung mundur
sekarang      = 19:45  → DIBUKA (T-15 menit)
```

Setiap pembukaan Room ID dicatat ke audit log (`room.view`) — termasuk siapa dan kapan.

**Panitia mengisi Room ID** lewat `PATCH` endpoint yang sama; setiap perubahan dicatat sebagai `room.set` (pertama kali) atau `room.rotate` (ganti). Room ID **tidak pernah** ikut terkirim ke non-staff lewat daftar match (disanitasi di `GET /matches`).

---

## 9. FASE 8 — Pertandingan & Input Skor

### 9a. Status match — apa yang sebenarnya terjadi

Match dibuat dengan `scheduled`. Saat panitia **submit skor**, status otomatis berubah jadi `ongoing` (dilakukan oleh endpoint hasil, bukan tombol terpisah).

> ⚠️ **Tidak ada kode yang mengubah status ke `selesai`.** Status `selesai` dan `dibatalkan` ada di enum tapi tidak pernah dipakai. Jadi setelah skor masuk, match tetap `ongoing` selamanya — meski hasilnya sudah `approved`. Ini celah kosmetik (Celah 3 di §13), tidak mempengaruhi klasemen.

### 9b. Panitia mengisi skor

**Halaman:** `/admin/[tournamentId]/skor` · **API:** `POST /api/tournaments/[id]/matches/[matchId]/results`

| Yang diinput | Yang TIDAK diinput |
|---|---|
| Screenshot scoreboard | ❌ Poin |
| Placement tiap tim (1–25) | ❌ Total |
| Jumlah kill tiap tim (0–40) | |

**Poin dihitung database, bukan manusia:**

```
points = placement_pts[placement] + (kills × kill_pt)

Contoh (config default):
  Juara 1, 8 kill  → 12 + (8×1) = 20 poin
  Juara 2, 5 kill  →  9 + (5×1) = 14 poin
  Juara 5, 0 kill  →  6 + (0×1) =  6 poin
```

Dihitung oleh trigger Postgres `calculate_points()` setiap kali baris ditulis. Admin **tidak punya kolom** untuk mengetik poin.

### 9c. Validasi saat submit

| Aturan | Batas |
|---|---|
| Placement | 1–25, **tidak boleh ganda** dalam satu match |
| Kills per tim | 0–40 |
| Screenshot | **Wajib** ada |

Hasil masuk dengan `status = pending`.

---

## 10. FASE 9 — Persetujuan Skor (Dual Control)

**API:** `POST /api/tournaments/[id]/matches/[matchId]/results/verify`

```
Siapa pun mengisi skor  →  status 'pending'
        ↓
Admin LAIN memeriksa    →  status 'approved'
        ↓
Trigger lock_point_config: tabel poin TERKUNCI
        ↓
View standings dihitung ulang
```

### Kenapa harus orang lain?

Karena `submitted_by` dicatat, dan aturan melarang orang yang sama menyetujui hasilnya. Ini **dual control** — satu orang tidak bisa mengubah klasemen sendirian.

> 🔴 **Ini masalah nyata di sistem Anda sekarang.** Kalau turnamen hanya punya **satu** staff (owner saja, tanpa admin kedua), maka **tidak ada yang bisa approve** — karena `verify` menolak self-approval. Skor akan menggantung di `pending` selamanya dan klasemen tidak pernah terisi.
>
> **Solusi yang perlu Anda pilih:**
> - **(b)** Izinkan self-approval **hanya jika** turnamen tidak punya staff lain
> - **(c)** Owner boleh override **dengan alasan wajib** + tercatat di audit log
>
> Belum diputuskan. Untuk sementara: **pastikan setiap turnamen punya minimal 2 staff.**

### Setelah approved

| Yang terjadi | Efek |
|---|---|
| `standings` view | Hitung ulang otomatis |
| `point_config` | **Terkunci permanen** — tidak bisa diubah lagi |
| Halaman publik | Klasemen langsung berubah |
| Audit log | Mencatat siapa yang approve |

---

## 11. FASE 10 — Klasemen & Juara

**Halaman publik:** `/t/[slug]/klasemen`

### Rumus klasemen

```
Total Poin = Σ poin semua match yang sudah APPROVED
             (hasil 'pending' tidak dihitung)
```

### Urutan tiebreaker (penentu juara)

```
1. Total poin        lebih besar menang
2. Total kill        lebih besar menang
3. Placement terbaik lebih kecil menang
4. Submit paling awal lebih dulu menang
```

Semua dihitung **on-the-fly** oleh view `standings` — tidak ada tabel klasemen yang perlu di-refresh manual.

---

## 12. Ringkasan: Siapa Melakukan Apa

| Fase | Pelaku | Aksi | Status berubah |
|---|---|---|---|
| 0 | Owner | Buat turnamen | — → `open` |
| 1 | Kapten | Daftarkan tim | tim → `draft` |
| 2 | Kapten | Isi roster 4 orang | tetap `draft` |
| 3 | Kapten | Upload bukti bayar | → `pending` |
| 4 | Panitia | Verifikasi | → `approved` |
| 5 | Panitia | Buat match + slotting | match → `scheduled` |
| 6 | Panitia | Isi Room ID | — |
| 7 | Peserta | Ambil Room ID (T-15) | — |
| 8 | Panitia | Input skor + screenshot | hasil → `pending` |
| 9 | **Admin lain** | Approve skor | hasil → `approved` |
| 10 | Sistem | Hitung klasemen | publik melihat |

---

## 13. Tiga Celah yang Saya Temukan Saat Membaca Kode

Saya menulis ini karena Anda perlu tahu sebelum turnamen sungguhan berjalan.

### 🔴 Celah 1 — Turnamen Satu Staff Tidak Bisa Menyelesaikan Turnamen

**Bukti:** `results/verify/route.ts` menolak bila `submitted_by === user.id`.

**Akibat:** turnamen dengan 1 staff → skor menggantung `pending` selamanya → klasemen kosong → tidak ada juara.

**Perbaikan:** pilih opsi (b) atau (c) di §10. Ini **harus** dibereskan sebelum turnamen pertama.

### 🟠 Celah 2 — Tim Belum Terverifikasi Bisa Dimasukkan ke Match

**Bukti:** `slots/route.ts` hanya menghapus lalu insert; tidak ada pengecekan `verification_status = 'approved'`.

**Akibat:** lewat API, tim `pending`/`rejected` bisa ikut bertanding.

**Perbaikan:** tambah satu query cek status sebelum insert (~10 baris).

### 🟡 Celah 3 — Status Turnamen & Match Tidak Pernah Maju

**Bukti:** tidak ada kode di `src/` yang mengubah status turnamen ke `closed`, `running`, atau `done`. Turnamen dibuat `open` dan tetap `open`. Sama untuk match: `selesai` dan `dibatalkan` tidak pernah dipakai.

**Akibat:**
- Roster tidak pernah terkunci otomatis (padahal ada pengecekan "roster locked jika closed/running")
- Pendaftaran tidak pernah ditutup otomatis
- Tidak ada penanda turnamen selesai
- Match tetap `ongoing` walau sudah lama selesai

**Perbaikan:** tombol "Tutup Pendaftaran" / "Mulai Turnamen" / "Selesaikan" di dashboard admin.

---

## 14. Di Mana AI Masuk dalam Alur Ini

AI **hanya menyentuh satu kotak**: Fase 8b (input skor).

```
Fase 0–7  ─────────────────────────────▶  TIDAK tersentuh AI
Fase 8a   match berjalan                  TIDAK tersentuh AI
Fase 8b   input skor                      ◀── AI bantu isi form
Fase 9    approval                        TIDAK tersentuh AI
Fase 10   klasemen                        TIDAK tersentuh AI
```

AI mengisi form di Fase 8b, lalu **alur berjalan persis seperti sekarang**. Detail lengkapnya ada di `ARSITEKTUR_AI_SCOREBOARD.md`.

**Alasan desain ini:** Fase 9 (dual control) dan Fase 10 (klasemen) adalah bagian paling sensitif. Menyentuhnya berarti mempertaruhkan kepercayaan pada seluruh sistem. AI ditempel di depan, bukan diselipkan ke dalam.

---

## 15. Cara Membaca Dokumen Ini

| Kalau Anda... | Baca |
|---|---|
| Panitia baru | §1 (peta besar) lalu §12 (ringkasan) |
| Pemilik turnamen | §13 (celah) — ini yang mendesak |
| Engineer baru | §2–§11 berurutan |
| Ingin tahu soal AI | §14 lalu `ARSITEKTUR_AI_SCOREBOARD.md` |

**Satu kalimat untuk diingat:** sistem ini memisahkan **orang yang mengisi** dari **orang yang menyetujui**, dan memisahkan **angka** dari **perhitungan poin**. Dua pemisahan itu adalah inti keamanannya.

