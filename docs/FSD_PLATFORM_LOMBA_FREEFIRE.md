# FSD — Platform Lomba Free Fire (ArenaKu)

| Field | Isi |
|---|---|
| **Nama Dokumen** | Functional Specification Document (FSD) |
| **Versi** | 1.0 (Draft) |
| **Tanggal** | 2026-02-XX |
| **Pemilik** | _[isi nama]_ |
| **Referensi Induk** | `PRD_PLATFORM_LOMBA_FREEFIRE.md` v1.0 |
| **Status** | Draft → Review → Baseline |
| **Audiens** | Developer, QA, UI/UX, Tech Lead |

---

## 0. Hierarki Dokumen (kenapa FSD terpisah dari PRD)

| Dokumen | Menjawab | Isi | Pembaca utama |
|---|---|---|---|
| **PRD** | **MENGAPA** & **APA** | Masalah, tujuan, metrik, persona, non-goals | Product, bisnis, stakeholder |
| **FSD** ← *dokumen ini* | **BAGAIMANA PERILAKUNYA** | Layar, field, validasi, state, pesan error, permission, alur alternatif | Developer, QA, desainer |
| **TDD/SDD** | **BAGAIMANA DIBANGUN** | Arsitektur, skema DB, library, deployment | Engineer |
| **API Spec** | **KONTRAK DATA** | Endpoint, request/response, error code | Backend + frontend |

**Aturan penting:** FSD **tidak boleh** menambah scope baru. Setiap requirement di sini harus bisa dilacak ke minimal satu User Story di PRD. Jika ada kebutuhan yang tidak punya induk di PRD, itu **change request** — bukan tambahan diam-diam di FSD.

**Yang TIDAK ada di FSD:** keputusan teknologi (React vs Vue), struktur folder, nama library, tuning database. Itu domain TDD. FSD harus tetap valid walaupun stack diganti total.

---

## 1. Ruang Lingkup FSD

### 1.1 Termasuk (In Scope)

Seluruh fitur **Must Have** dari PRD §6.1 (US-01 s/d US-18), dispesifikasikan sampai level:
- Layar & navigasi
- Field input + aturan validasi + pesan error
- Aksi & efek samping
- Transisi state
- Matriks permission per aksi
- Kriteria penerimaan yang bisa diuji

### 1.2 Tidak Termasuk (Out of Scope)

- Fitur Should/Could Have (PRD §6.2, §6.3) — hanya dicatat sebagai *forward compatibility note* bila memengaruhi desain data.
- Detail implementasi teknis (query, index, cache) — lihat TDD.
- Materi marketing, pricing page, onboarding video.

### 1.3 Asumsi & Dependensi

| # | Asumsi | Dampak jika salah |
|---|---|---|
| A1 | Free Fire tidak punya API; Room ID selalu input manual | Tidak ada integrasi otomatis; seluruh alur bergantung pada admin |
| A2 | Mayoritas akses dari HP (≥80%), browser Chrome/WebView | Desain harus mobile-first; tabel lebar perlu alternatif kartu |
| A3 | Satu turnamen = satu penyelenggara (single-tenant di MVP) | Multi-tenant jadi perubahan besar, bukan sekadar tambah kolom |
| A4 | Pembayaran diverifikasi manual (transfer bank) | Tidak butuh webhook payment gateway di MVP |
| A5 | Format match: Battle Royale berbasis poin (bukan eliminasi) di MVP | Format eliminasi butuh struktur bracket berbeda |

---

## 2. Traceability Matrix (PRD → FSD)

Setiap User Story PRD dipetakan ke modul, layar, dan aturan bisnis di FSD ini. **QA memakai tabel ini untuk memastikan tidak ada requirement yang hilang.**

| US | Judul | Modul | Layar | Business Rule |
|---|---|---|---|---|
| US-01 | Daftar akun | Auth | SCR-A01 | BR-AUTH-01..05 |
| US-02 | Buat tim | Tim | SCR-T01 | BR-TEAM-01..04 |
| US-03 | Kelola roster | Tim | SCR-T02 | BR-ROST-01..06 |
| US-04 | Upload bukti bayar | Tim | SCR-T03 | BR-PAY-01..05 |
| US-05 | Tolak duplikat tim/UID | Tim | SCR-T01, T02 | BR-TEAM-02, BR-ROST-03 |
| US-06 | Admin verifikasi tim | Verifikasi | SCR-V01 | BR-VER-01..04 |
| US-07 | Kapten lihat status verifikasi | Tim | SCR-T04 | BR-VER-05 |
| US-08 | Buat match & slot | Match | SCR-M01 | BR-MAT-01..03 |
| US-09 | Isi Room ID | Match | SCR-M02 | BR-ROOM-01..03 |
| US-10 | Kapten lihat Room ID | Match | SCR-T05 | BR-ROOM-04..07 |
| US-11 | Input skor | Skor | SCR-S01 | BR-SCR-01..06 |
| US-12 | Approve skor | Skor | SCR-S02 | BR-SCR-07..10 |
| US-13 | Hitung poin server-side | Skor | — (server) | BR-SCR-11..13 |
| US-14 | Klasemen publik | Publik | SCR-P01 | BR-CLS-01..05 |
| US-15 | Bracket publik | Publik | SCR-P02 | BR-CLS-06 |
| US-16 | Audit log | Audit | SCR-AUD01 | BR-AUD-01..04 |
| US-17 | Dispute hasil | Dispute | SCR-T06, SCR-S03 | BR-DSP-01..06 |
| US-18 | Roster lock | Tim | SCR-T02 | BR-ROST-07..08 |

---

## 3. Peta Layar & Navigasi

### 3.1 Daftar Layar

| ID | Layar | Akses | Auth? | Tujuan |
|---|---|---|---|---|
| SCR-A01 | Login | semua | tidak | Masuk |
| SCR-A02 | Register | semua | tidak | Buat akun |
| SCR-A03 | Lupa password | semua | tidak | Reset via email |
| SCR-D01 | Dashboard kapten | kapten | ya | Ringkasan tim & jadwal |
| SCR-D02 | Dashboard admin | admin, panitia | ya | Ringkasan turnamen |
| SCR-T01 | Buat tim | kapten | ya | Form pendaftaran tim |
| SCR-T02 | Kelola roster | kapten, admin | ya | CRUD anggota |
| SCR-T03 | Upload bukti bayar | kapten | ya | Kirim bukti transfer |
| SCR-T04 | Status tim | kapten | ya | Lihat status verifikasi |
| SCR-T05 | Jadwal & Room ID | kapten | ya | Lihat match + room |
| SCR-T06 | Ajukan dispute | kapten | ya | Form sengketa |
| SCR-T07 | Undang Anggota | kapten | ya | Kirim undangan tim (BARU — Keputusan F1/Q2) |
| SCR-T08 | Terima Undangan | anggota | tidak* | Terima/tolak undangan (*login diperlukan setelah preview) |
| SCR-V01 | Verifikasi tim (antrian) | admin | ya | Approve/reject tim |
| SCR-M01 | Kelola match | admin, panitia | ya | CRUD match & slot |
| SCR-M02 | Atur Room ID | admin | ya | Isi/rotasi room |
| SCR-S01 | Input skor | panitia, admin | ya | Entry hasil match |
| SCR-S02 | Antrian approval skor | admin | ya | Approve/reject hasil |
| SCR-S03 | Putuskan dispute | admin | ya | Selesaikan sengketa |
| SCR-AUD01 | Audit log | admin, owner | ya | Lihat jejak perubahan |
| SCR-P01 | Klasemen publik | publik | **tidak** | Leaderboard |
| SCR-P02 | Bracket/jadwal publik | publik | **tidak** | Jadwal & hasil |
| SCR-P03 | Halaman turnamen publik | publik | **tidak** | Landing + daftar |

### 3.2 Navigasi

```
PUBLIK (tanpa login)
  SCR-P03 ──┬─► SCR-P01 (klasemen)
            ├─► SCR-P02 (jadwal/bracket)
            └─► SCR-A01 (login) / SCR-A02 (register)

KAPTEN
  SCR-A01 ─► SCR-D01 ─┬─► SCR-T01/T02/T03/T04 (tim saya)
                      ├─► SCR-T05 (jadwal + room)
                      └─► SCR-T06 (dispute)

ADMIN / PANITIA
  SCR-A01 ─► SCR-D02 ─┬─► SCR-V01 (verifikasi tim)
                      ├─► SCR-M01/M02 (match + room)
                      ├─► SCR-S01 (input skor)
                      ├─► SCR-S02 (approve skor)      [admin saja]
                      ├─► SCR-S03 (dispute)           [admin saja]
                      └─► SCR-AUD01 (audit log)       [admin saja]
```

**Aturan navigasi:**
- Menu yang tidak boleh diakses **tidak dirender** (bukan hanya di-disable) — mengurangi kebingungan panitia baru.
- Akses langsung ke URL terlarang → **403 dengan halaman penjelasan**, bukan redirect diam-diam.
- Halaman publik tidak menampilkan tombol login mencolok — hanya link kecil di footer.

---

## 4. Business Rules (inti FSD)

Format ID: `BR-<DOMAIN>-<NOMOR>`. Setiap aturan harus bisa diuji. Jika QA tidak bisa memverifikasi sebuah aturan, aturan itu belum cukup spesifik.

### 4.1 AUTH

| ID | Aturan | Pesan/Perilaku |
|---|---|---|
| BR-AUTH-01 | Email wajib valid & unik (case-insensitive) | "Email sudah terdaftar. Coba masuk atau gunakan email lain." |
| BR-AUTH-02 | Password minimal 8 karakter, harus ada huruf & angka | "Password minimal 8 karakter dan mengandung huruf serta angka." |
| BR-AUTH-03 | Login gagal 5x dalam 15 menit per IP+email → lock 15 menit | "Terlalu banyak percobaan. Coba lagi dalam 15 menit." |
| BR-AUTH-04 | Session 7 hari; "ingat saya" 30 hari | — |
| BR-AUTH-05 | User belum verifikasi email **tetap bisa** login, diberi banner peringatan. Tidak diblokir (MVP) | Banner: "Email belum diverifikasi. Verifikasi untuk menerima notifikasi." |

> **Catatan desain:** memblokir login sampai verifikasi email terbukti menurunkan konversi registrasi drastis di komunitas gamer (banyak memakai email tidak aktif). Banner + akses terbatas lebih baik daripada gate keras.

### 4.2 TEAM

| ID | Aturan |
|---|---|
| BR-TEAM-01 | Tim hanya bisa dibuat jika turnamen berstatus `open` |
| BR-TEAM-02 | Nama tim unik per turnamen (case-insensitive, trim spasi). 3–30 karakter, alfanumerik + spasi + `-` + `_` |
| BR-TEAM-03 | Satu user hanya bisa menjadi kapten **1 tim per turnamen** |
| BR-TEAM-04 | Logo opsional, maks 2 MB, JPG/PNG, rasio disarankan 1:1 |

### 4.3 ROSTER

| ID | Aturan |
|---|---|
| BR-ROST-01 | Minimal 4 anggota inti, maksimal 6 (4 inti + 2 cadangan) |
| BR-ROST-02 | IGN 3–20 karakter, alfanumerik + simbol umum |
| BR-ROST-03 | UID: 8–12 digit angka, **unik per turnamen** lintas semua tim |
| BR-ROST-04 | Maksimal 2 anggota berstatus substitute |
| BR-ROST-05 | Perubahan roster hanya oleh kapten tim tersebut, atau admin |
| BR-ROST-06 | Setiap perubahan roster tercatat di audit log (termasuk sebelum lock) |
| BR-ROST-07 | **Roster lock:** saat turnamen → `closed`, semua field roster read-only untuk kapten |
| BR-ROST-08 | Setelah lock, hanya `admin`/`owner` bisa mengubah, **wajib alasan** (min 10 karakter), tercatat di audit log, memicu notifikasi ke kapten |

**Perilaku UI saat lock (BR-ROST-07):** tombol "Tambah anggota" dan "Edit" **hilang**, bukan disabled. Diganti banner: _"Roster dikunci sejak 12 Feb 2026. Hubungi panitia untuk perubahan."_

### 4.4 PAYMENT

| ID | Aturan |
|---|---|
| BR-PAY-01 | Bukti bayar: JPG/PNG/PDF, maks 5 MB, wajib sebelum submit verifikasi |
| BR-PAY-02 | Satu tim hanya punya 1 bukti aktif; upload ulang **menggantikan** (versi lama tetap tersimpan) |
| BR-PAY-03 | `payment_status`: `unpaid` → `submitted` → `verified` \| `rejected` |
| BR-PAY-04 | Saat `rejected`, kapten bisa upload ulang; status kembali ke `submitted` |
| BR-PAY-05 | Entry fee = 0 → `payment_status` otomatis `verified`, upload bukti dilewati |

### 4.5 VERIFICATION

| ID | Aturan |
|---|---|
| BR-VER-01 | Hanya `admin`/`owner` yang bisa approve/reject tim |
| BR-VER-02 | Reject **wajib** alasan (min 20 karakter), dengan pilihan cepat: "Bukti tidak jelas", "Nominal tidak sesuai", "Roster tidak lengkap" |
| BR-VER-03 | Approve hanya bisa jika `payment_status = submitted` (atau entry fee 0) |
| BR-VER-04 | Setelah approve: `payment_status` = `verified`, `verification_status` = `approved`. Tidak bisa approve dua kali |
| BR-VER-05 | Kapten melihat status + alasan reject di SCR-T04 dan menerima email |

### 4.6 MATCH

| ID | Aturan |
|---|---|
| BR-MAT-01 | Match hanya bisa dibuat saat turnamen `closed` atau `running` |
| BR-MAT-02 | Satu match berisi 2–25 tim; satu tim tidak boleh muncul 2x di match yang sama |
| BR-MAT-03 | Nomor `slot` unik per match, dipakai untuk urutan drop/seed |
| BR-MAT-04 | `status`: `scheduled` → `ongoing` → `selesai` \| `dibatalkan` |
| BR-MAT-05 | Match `dibatalkan` tidak dihitung di klasemen |

### 4.7 ROOM (paling sensitif — requirement P0)

| ID | Aturan |
|---|---|
| BR-ROOM-01 | Room ID & password hanya bisa diisi/diubah oleh `admin` |
| BR-ROOM-02 | Room ID hanya bisa diisi jika match `scheduled` atau `ongoing` |
| BR-ROOM-03 | Setiap perubahan Room ID tercatat di audit log (nilai lama & baru disimpan) |
| BR-ROOM-04 | **Visibilitas:** hanya kapten & anggota tim yang terdaftar di `match_teams` match tersebut |
| BR-ROOM-05 | **Waktu:** Room ID hanya tampil jika `published_at` tidak null **dan** sekarang ≥ `jadwal − 15 menit` |
| BR-ROOM-06 | Setiap kali Room ID dibuka, tercatat di audit log (`action: room.view`) |
| BR-ROOM-07 | Room ID **tidak pernah** muncul di: halaman publik, response API publik, email massal, atau export apa pun |

**Perilaku UI (BR-ROOM-05):** sebelum waktunya tampilkan countdown — _"Room ID tersedia 15 menit sebelum match dimulai — pukul 19.45."_ Setelah waktunya tampilkan tombol **"Tampilkan Room ID"** (bukan langsung terlihat). Klik → reveal + tercatat di audit. Ini mencegah screenshot tidak sengaja terkirim ke grup lain.

### 4.8 SCORE

| ID | Aturan |
|---|---|
| BR-SCR-01 | `placement` dan `kills` wajib untuk setiap tim peserta match |
| BR-SCR-02 | `placement` unik per match — dua tim tidak boleh placement sama |
| BR-SCR-03 | `kills` ≥ 0 dan ≤ 40 per tim per match |
| BR-SCR-04 | Screenshot scoreboard **wajib** sebelum submit (JPG/PNG, maks 5 MB) |
| BR-SCR-05 | Hasil hanya bisa diinput jika match `ongoing` atau `selesai` |
| BR-SCR-06 | Setelah submit, status hasil = `pending`; tidak bisa diedit sampai reject |
| BR-SCR-07 | Approver **tidak boleh** sama dengan `submitted_by` (ditolak sistem, bukan peringatan) |
| BR-SCR-08 | Reject wajib alasan (min 20 karakter) |
| BR-SCR-09 | Hasil `pending`/`rejected` **tidak** masuk klasemen |
| BR-SCR-10 | Setelah `approved`, hasil terkunci. Perubahan hanya via dispute atau recalculate admin (dengan alasan) |
| BR-SCR-11 | `points` dihitung **server-side**: `placement_points[placement] + (kills × kill_point)` |
| BR-SCR-12 | Nilai `points` dari client **diabaikan total** — tidak divalidasi, langsung ditimpa |
| BR-SCR-13 | Formula `point_config` terkunci setelah ada minimal 1 hasil `approved` |

### 4.9 CLASSIFICATION (Klasemen)

| ID | Aturan |
|---|---|
| BR-CLS-01 | Klasemen **dihitung ulang setiap request**, tidak disimpan |
| BR-CLS-02 | Hanya hasil `approved` dari match `selesai` yang dihitung |
| BR-CLS-03 | Urutan: `total_points DESC` → `total_kills DESC` → `best_placement ASC` → `earliest_submit ASC` |
| BR-CLS-04 | Jika masih seri, tampilkan **shared rank** (posisi sama, mis. "3=") |
| BR-CLS-05 | Tim tanpa match tampil di bawah dengan `0 poin`, bukan disembunyikan |
| BR-CLS-06 | Halaman publik hanya menampilkan: nama tim, logo, match dimainkan, total kills, total poin, peringkat. **Tidak** menampilkan UID, email, nomor WA |

### 4.10 AUDIT

| ID | Aturan |
|---|---|
| BR-AUD-01 | Tabel audit **append-only** — tidak ada endpoint update/delete, termasuk untuk owner |
| BR-AUD-02 | Wajib mencatat: approve/reject tim, perubahan roster, input/approve/reject/recalculate hasil, perubahan Room ID, akses Room ID, transisi status turnamen, perubahan role |
| BR-AUD-03 | Setiap entri menyimpan `before` dan `after` (JSON) serta `reason` bila aksi destruktif |
| BR-AUD-04 | Audit log hanya bisa dilihat `admin`/`owner`; kapten hanya melihat histori hasil timnya sendiri |

### 4.11 DISPUTE

| ID | Aturan |
|---|---|
| BR-DSP-01 | Hanya kapten tim peserta match yang bisa mengajukan dispute |
| BR-DSP-02 | Dispute hanya untuk hasil berstatus `approved` |
| BR-DSP-03 | Batas waktu: 24 jam setelah `verified_at`; lewat itu tombol hilang |
| BR-DSP-04 | Maksimal 1 dispute aktif per match per tim |
| BR-DSP-05 | Alasan wajib, min 50 karakter. Bukti opsional (maks 3 file × 5 MB) |
| BR-DSP-06 | Selama `disputed`, klasemen **tetap** memakai nilai `approved` |
| BR-DSP-07 | Keputusan admin wajib alasan (min 20 karakter) dan memicu notifikasi ke kapten |

---

## 5. Spesifikasi Layar (detail untuk layar kritis)

Format: **Tujuan → Field & Validasi → Aksi → State → Kriteria Penerimaan**. Layar lain mengikuti template §5.5.

### 5.1 SCR-A02 — Register

| Field | Tipe | Wajib | Validasi | Pesan error |
|---|---|---|---|---|
| Nama lengkap | text | ya | 2–60 char | "Nama minimal 2 karakter." |
| Email | email | ya | format + unik | "Format email tidak valid." / "Email sudah terdaftar." |
| No. WhatsApp | tel | ya | 10–15 digit, awalan 08/62 | "Nomor WhatsApp tidak valid. Contoh: 08123456789." |
| Password | password | ya | min 8, huruf + angka | "Password minimal 8 karakter dan mengandung huruf serta angka." |
| Konfirmasi password | password | ya | identik | "Konfirmasi password tidak cocok." |
| Setuju S&K | checkbox | ya | true | "Anda harus menyetujui syarat & ketentuan." |

**Aksi:** tombol **Daftar** → buat akun, kirim email verifikasi, redirect ke SCR-D01 + banner. Tombol disabled sampai valid; validasi saat `blur`, bukan hanya saat submit.

| State | Tampilan |
|---|---|
| Loading | Tombol → spinner, form disabled |
| Error validasi | Pesan di bawah field, border merah, auto-fokus ke error pertama |
| Error server | Banner atas + tombol retry |
| Sukses | Redirect + toast "Akun berhasil dibuat" |

**Kriteria penerimaan:**
1. Email duplikat → error, tidak ada akun terbuat.
2. Password tanpa angka → submit disabled + pesan jelas.
3. Submit kosong → semua pesan muncul sekaligus, fokus ke field pertama.
4. WA `0812345` (7 digit) → ditolak dengan contoh format.
5. Setelah sukses bisa langsung login tanpa verifikasi email (BR-AUTH-05).

### 5.2 SCR-T02 — Kelola Roster

| Field | Tipe | Wajib | Validasi |
|---|---|---|---|
| IGN | text | ya | 3–20 char |
| UID | text | ya | 8–12 digit, unik per turnamen |
| Peran | select | ya | `rusher`/`sniper`/`support`/`igl`/`cadangan` |
| Status | toggle | ya | inti / substitute (maks 2) |

**Aksi:**
- **Tambah anggota** — hanya muncul jika `< 6` anggota dan roster tidak locked.
- **Edit** / **Hapus** per baris — hapus butuh konfirmasi modal.
- **Simpan roster** — validasi seluruh roster sebelum commit.

| Kondisi | Tampilan |
|---|---|
| Roster locked (BR-ROST-07) | Tombol tambah/edit **hilang**; banner: _"Roster dikunci sejak 12 Feb 2026. Hubungi panitia untuk perubahan."_ |
| Anggota < 4 | Banner kuning: _"Minimal 4 anggota inti untuk bisa diverifikasi."_ Tombol "Ajukan verifikasi" disabled |
| UID duplikat | Error inline: _"UID ini sudah terdaftar di tim [nama tim]."_ |
| Ada perubahan belum simpan | Modal saat navigasi keluar: _"Ada perubahan belum disimpan. Tinggalkan halaman?"_ |

**Kriteria penerimaan:**
1. Tambah anggota ke-7 → tombol tambah hilang/disabled dengan penjelasan.
2. UID sama dengan tim lain di turnamen sama → ditolak + nama tim pemakainya.
3. Tambah 3 substitute → ditolak (BR-ROST-04).
4. Setelah turnamen `closed`, semua field read-only untuk kapten.
5. Setiap simpan menghasilkan entri audit log dengan `before`/`after`.

### 5.3 SCR-S01 — Input Skor

**Tujuan:** panitia memasukkan hasil satu match.

**Struktur:** tabel per tim peserta (bukan form bebas), karena placement harus unik dan lengkap.

| Kolom | Tipe | Validasi |
|---|---|---|
| Tim | read-only | dari `match_teams` |
| Placement | number | 1–25, unik antar baris |
| Kills | number | 0–40 |
| Poin | read-only | preview live di UI; server tetap otoritatif |
| Screenshot | upload | wajib 1 per match (bukan per tim) |

**Aksi:**
- **Simpan draft** — boleh setengah terisi, tidak masuk klasemen.
- **Submit untuk approval** — validasi penuh: semua tim terisi, placement unik & lengkap 1..N, screenshot ada.
- ~~Import dari screenshot~~ — **tidak ada di MVP** (PRD §4).

| Kondisi | Tampilan |
|---|---|
| Placement duplikat | Kedua baris merah + _"Placement 3 dipakai dua kali."_ Submit disabled |
| Placement tidak lengkap | _"Placement harus berurutan 1 sampai 12. Nomor 7 belum diisi."_ |
| Screenshot belum ada | Submit disabled + _"Unggah screenshot scoreboard untuk melanjutkan."_ |
| Sudah submit | Form read-only, badge `Menunggu approval`, tampilkan siapa & kapan |
| Match belum `ongoing`/`selesai` | Form disabled + penjelasan status match |

**Kriteria penerimaan:**
1. Submit tanpa screenshot → ditolak.
2. Dua tim placement 1 → ditolak.
3. Panitia A submit lalu coba approve sendiri → ditolak (BR-SCR-07).
4. Setelah submit, form read-only sampai di-reject.
5. Field `points` diubah manual di body request → server mengabaikan dan menghitung ulang.

### 5.4 SCR-T05 — Jadwal & Room ID (kapten)

**Tampilan:** daftar kartu per match (mobile-first), **bukan** tabel. Kartu berisi nama match, jadwal (WIB), status, tombol **Lihat Room ID**.

| Kondisi | Yang tampil |
|---|---|
| Belum `published` | _"Jadwal belum dipublikasikan panitia."_ (tanpa tombol) |
| `published`, > 15 menit sebelum jadwal | Countdown: _"Room ID tersedia pukul 19.45 (15 menit sebelum match)."_ |
| `published`, dalam window | Tombol **Tampilkan Room ID** → reveal ID + password, tombol berubah jadi **Salin** |
| Match `selesai` | Room ID disembunyikan lagi; tampilkan hasil & poin tim |
| Kapten bukan peserta | Kartu tidak muncul sama sekali (bukan disabled) |

**Kriteria penerimaan:**
1. Kapten tim lain akses langsung URL room bukan miliknya → **403**.
2. Sebelum T-15 menit, endpoint mengembalikan `403 ROOM_NOT_YET_AVAILABLE`.
3. Klik reveal → entri `room.view` di audit log dengan timestamp.
4. Room ID **tidak ada di HTML awal** (fetch terpisah) — mencegah muncul di cache/SEO.
5. Setelah admin rotasi Room ID, kapten melihat nilai baru pada refresh berikutnya.

### 5.5 SCR-T07 — Undang Anggota

**Tujuan:** Kapten mengundang pemain untuk bergabung ke roster tim via email.

**Siapa:** `kapten` tim yang bersangkutan.

| Field | Tipe | Wajib | Validasi |
|---|---|---|---|
| Email pemain | email | ya | Format valid; sistem cari user terdaftar |
| IGN (In-Game Name) | text | ya | 3–20 karakter |
| UID Game | text | ya | 8–12 digit angka, unik per turnamen |
| Peran | select | ya | rusher / sniper / support / igl / cadangan |
| Status | toggle | ya | Inti / Substitute (maks 2 substitute total) |

**Aksi:**

- **Kirim Undangan** → buat `team_invitations` dengan token unik, kirim email ke pemain via Resend.
- Email berisi link: `{APP_URL}/tim/bergabung/{token}`

| Kondisi | Tampilan |
|---|---|
| Email belum terdaftar | Banner info: _"Email ini belum punya akun ArenaKu. Undangan tetap dikirim — pemain perlu daftar dulu sebelum bisa menerima."_ |
| UID sudah dipakai tim lain | Error inline: _"UID ini sudah terdaftar di tim [nama tim]."_ |
| Anggota sudah 6 | Tombol "Tambah Undangan" hilang + penjelasan batas |
| Substitute sudah 2 | Toggle substitute disabled dengan penjelasan |
| Roster locked | Seluruh form disabled + banner: _"Roster sudah dikunci. Hubungi panitia."_ |
| Undangan pending ada | Tampilkan daftar undangan terkirim + status (pending/accepted/declined/expired) |

**Kriteria Penerimaan:**

1. Kirim undangan ke email terdaftar → email diterima dalam 2 menit, undangan masuk daftar `pending`.
2. Kirim undangan ke email belum terdaftar → email terkirim, status `pending`, bisa diterima setelah daftar.
3. UID duplikat → ditolak sebelum submit, error inline dengan nama tim pemakai.
4. Kirim ke anggota yang sudah di tim → ditolak: _"Pemain ini sudah terdaftar di tim [nama]."_
5. Token undangan expire setelah 7 hari → status berubah ke `expired`, tidak bisa digunakan.
6. Kapten bisa batalkan undangan `pending` → status berubah ke `expired`.

---

### 5.6 SCR-T08 — Terima Undangan

**Tujuan:** Pemain melihat detail undangan tim dan memutuskan untuk menerima atau menolak.

**Siapa:** Siapapun via link (publik untuk preview), butuh login untuk aksi.

**URL:** `/tim/bergabung/{token}`

**Alur:**

```
Buka link (tanpa login)
  → Tampilkan preview: nama turnamen, nama tim, kapten, peran, IGN, UID
  → Tombol "Masuk untuk Menerima" / "Tolak"
      │
      ▼
  Jika belum login → redirect ke /register (baru) atau /login
  Setelah login → kembali ke halaman ini
      │
      ▼
  Tampilkan detail + tombol "Terima Undangan" / "Tolak"
```

| Kondisi | Tampilan |
|---|---|
| Token valid, belum expired, status pending | Preview normal + tombol terima/tolak |
| Token expired | _"Undangan ini sudah kadaluarsa (7 hari). Minta kapten kirim ulang."_ |
| Token sudah accepted/declined | _"Undangan ini sudah diproses sebelumnya."_ |
| Token tidak ditemukan | 404 dengan pesan: _"Undangan tidak ditemukan atau sudah tidak valid."_ |
| User login tapi email berbeda dengan `invited_email` | Banner peringatan: _"Undangan ini ditujukan untuk {email}. Anda sedang login sebagai {email_login}. Lanjutkan?"_ + tombol konfirmasi |
| Terima berhasil | Redirect ke SCR-T04 (Status Tim) + toast: _"Selamat! Kamu resmi bergabung di tim [nama tim]."_ |

**Aksi Terima:**

1. Validasi token masih `pending` dan belum expired.
2. Validasi slot roster belum penuh (< 6 anggota).
3. Validasi UID belum dipakai tim lain di turnamen yang sama.
4. Insert ke `team_members` dengan `user_id` dari session yang sedang login.
5. Update `team_invitations.status` → `accepted`.
6. Update `team_invitations.invited_user_id` → user yang login.
7. Catat di `audit_log` (`action: member.joined`, `entity: team`).
8. Kirim notifikasi in-app ke kapten.

**Aksi Tolak:**

1. Update `team_invitations.status` → `declined`.
2. Catat di `audit_log`.
3. Kirim notifikasi in-app ke kapten.

**Kriteria Penerimaan:**

1. Token valid + user login sesuai email → terima berhasil, masuk `team_members`.
2. Token valid + user login email berbeda → tampil warning, bisa tetap lanjut.
3. Token expired → halaman error informatif, tanpa 500.
4. Terima dua kali → ditolak: _"Kamu sudah menjadi anggota tim ini."_
5. Roster sudah penuh (6 orang) → ditolak saat terima: _"Roster tim sudah penuh."_
6. UID duplikat saat terima (race condition) → ditolak dengan nama tim pemakai.

---

### 5.7 Template untuk Layar Lain

Setiap layar baru wajib mendokumentasikan minimal:

1. **Tujuan** dalam satu kalimat.
2. **Siapa** yang boleh akses (role).
3. **Daftar field** dengan tipe, wajib/tidak, aturan validasi.
4. **Aksi** dan efek sampingnya (termasuk entri audit).
5. **State**: loading, kosong, error, sukses, terlarang.
6. **Kriteria penerimaan** yang bisa diuji QA tanpa bertanya ke developer.

**Aturan umum semua layar:**
- **Empty state harus menjelaskan langkah berikutnya**, bukan "Tidak ada data". Contoh: _"Belum ada tim mendaftar. Bagikan link pendaftaran ke grup WhatsApp."_ + tombol salin link.
- **Error harus menyebutkan apa yang salah dan apa yang harus dilakukan.** "Terjadi kesalahan" tanpa tindakan lanjut tidak diterima.
- **Aksi destruktif** (hapus, reject, rotasi room) selalu butuh konfirmasi modal + alasan bila tercatat di audit.

---

## 6. Matriks Permission (RBAC)

`✅` diizinkan · `❌` ditolak (403) · `👁` read-only · `—` tidak relevan

| Aksi | owner | admin | panitia | kapten | peserta | publik |
|---|---|---|---|---|---|---|
| Buat turnamen | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ubah status turnamen | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Buat tim | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Lihat roster tim lain | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit roster (sebelum lock) | ✅ | ✅ | ❌ | ✅ (timnya) | ❌ | ❌ |
| Edit roster (setelah lock) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload bukti bayar | ❌ | ❌ | ❌ | ✅ (timnya) | ❌ | ❌ |
| Approve/reject tim | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Buat/edit match | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Isi/rotasi Room ID | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Lihat Room ID** | ✅ | ✅ | ❌ | ✅ (match-nya) | ✅ (match-nya) | ❌ |
| Input skor | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Approve/reject skor** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Recalculate poin | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ajukan dispute | ❌ | ❌ | ❌ | ✅ (timnya) | ❌ | ❌ |
| Putuskan dispute | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lihat audit log penuh | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lihat klasemen | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lihat data pribadi (email/WA/UID) | ✅ | ✅ | 👁 (perlu) | 👁 (timnya) | 👁 (dirinya) | ❌ |

**Catatan implementasi:**
- `panitia` **tidak** boleh melihat Room ID. Panitia tidak membutuhkannya untuk tugas input skor; ini mengurangi permukaan kebocoran. Jika panitia perlu masuk sebagai observer, ditangani di luar platform.
- Permission dievaluasi **server-side pada setiap request**. UI hanya menyembunyikan — tidak pernah menjadi pengaman.
- Penolakan mengembalikan **403 + kode error spesifik**, bukan 404. (404 hanya untuk resource yang benar-benar tidak ada, mencegah enumeration.)

---

## 7. State Machine Ringkas

### 7.1 Turnamen

| Dari | Ke | Siapa | Syarat | Efek |
|---|---|---|---|---|
| `draft` | `open` | admin | ≥1 config match, formula valid | Publik bisa lihat, registrasi dibuka |
| `open` | `closed` | admin | — | Roster lock; tim `pending` auto-reject + alasan |
| `closed` | `running` | admin | ≥2 tim `verified` | Room ID bisa dipublish |
| `running` | `done` | admin | semua match `selesai` & hasil `approved` | Klasemen final, dispute ditutup |
| `running` | `closed` | **owner** | alasan wajib | Rollback (audit log) |

### 7.2 Tim

```
draft ──► pending ──► approved
            │
            └──► rejected ──► pending (setelah upload ulang)
```

### 7.3 Hasil (result)

```
draft ──► pending ──► approved ──► disputed ──┬─► approved (upheld, nilai berubah)
            │                                 └─► approved (ditolak, nilai tetap)
            └──► rejected ──► pending (revisi)
```

**Aturan:** `approved` tidak bisa kembali ke `pending` tanpa melalui `disputed` atau recalculate admin (alasan + audit).

### 7.4 Match

```
scheduled ──► ongoing ──► selesai
     │            │
     └────────────┴──► dibatalkan
```

---

## 8. Kode Error Standar

Frontend menampilkan pesan manusia; developer & QA memakai kode.

| Kode | HTTP | Kapan | Pesan UI |
|---|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Email/password salah | "Email atau password salah." |
| `AUTH_RATE_LIMITED` | 429 | >5 gagal login | "Terlalu banyak percobaan. Coba lagi dalam 15 menit." |
| `AUTH_SESSION_EXPIRED` | 401 | Session habis | "Sesi Anda berakhir. Silakan masuk lagi." |
| `FORBIDDEN_ROLE` | 403 | Role tidak berhak | "Anda tidak memiliki akses ke halaman ini." |
| `TEAM_NAME_TAKEN` | 409 | Nama tim duplikat | "Nama tim sudah dipakai. Pilih nama lain." |
| `TEAM_ALREADY_CAPTAIN` | 409 | Sudah jadi kapten | "Anda sudah terdaftar sebagai kapten di turnamen ini." |
| `TEAM_NOT_OPEN` | 409 | Turnamen tidak `open` | "Pendaftaran turnamen sudah ditutup." |
| `ROSTER_LOCKED` | 409 | Roster locked | "Roster sudah dikunci. Hubungi panitia untuk perubahan." |
| `ROSTER_UID_DUPLICATE` | 409 | UID dipakai tim lain | "UID ini sudah terdaftar di tim [X]." |
| `ROSTER_MIN_MEMBERS` | 422 | Anggota < 4 | "Minimal 4 anggota inti." |
| `ROOM_NOT_YET_AVAILABLE` | 403 | Belum T-15 menit | "Room ID tersedia 15 menit sebelum match." |
| `ROOM_NOT_PARTICIPANT` | 403 | Bukan peserta match | "Anda tidak terdaftar di match ini." |
| `SCORE_PLACEMENT_DUPLICATE` | 422 | Placement ganda | "Placement [N] dipakai dua kali." |
| `SCORE_PLACEMENT_INCOMPLETE` | 422 | Placement tidak lengkap | "Placement harus berurutan 1 sampai [N]." |
| `SCORE_SCREENSHOT_REQUIRED` | 422 | Tanpa screenshot | "Unggah screenshot scoreboard." |
| `SCORE_SELF_APPROVAL` | 403 | Approver = submitter | "Anda tidak bisa menyetujui hasil yang Anda input sendiri." |
| `SCORE_ALREADY_APPROVED` | 409 | Approve 2x | "Hasil ini sudah disetujui." |
| `DISPUTE_WINDOW_CLOSED` | 409 | Lewat 24 jam | "Batas waktu pengajuan dispute sudah lewat." |
| `UPLOAD_TOO_LARGE` | 413 | File > 5 MB | "Ukuran file maksimal 5 MB." |
| `UPLOAD_INVALID_TYPE` | 415 | Bukan JPG/PNG/PDF | "Format file harus JPG, PNG, atau PDF." |
| `RATE_LIMITED` | 429 | Terlalu banyak request | "Terlalu banyak permintaan. Tunggu sebentar." |
| `INTERNAL_ERROR` | 500 | Bug server | "Terjadi kesalahan pada sistem. Tim kami sudah diberi tahu." |

**Aturan:** setiap kode error baru **wajib** ditambahkan ke tabel ini sebelum di-merge. Kode error yang tidak terdokumentasi = bug.

---

## 9. Aturan UX Lintas Layar

| # | Aturan | Alasan |
|---|---|---|
| UX-01 | Semua waktu ditampilkan dalam **WIB** dengan label eksplisit | Peserta tersebar; "19.00" tanpa zona = sumber salah paham |
| UX-02 | Format tanggal `12 Feb 2026`, bukan `02/12/26` | Menghindari ambiguitas DD/MM vs MM/DD |
| UX-03 | Angka penting (poin, placement, kill) pakai **font tabular** | Kolom angka rata → mudah dibandingkan |
| UX-04 | Tombol utama satu per layar; aksi sekunder jadi link/ghost | Mengurangi salah klik saat panik di hari-H |
| UX-05 | Aksi tidak bisa dibatalkan → konfirmasi modal dengan **nama entitas** disebut | "Hapus tim Garuda?" lebih aman dari "Anda yakin?" |
| UX-06 | Semua form: label di atas field, **bukan** placeholder-only | Placeholder hilang saat mengetik |
| UX-07 | Tabel di mobile → berubah jadi **kartu**, bukan scroll horizontal | Scroll horizontal di HP hampir selalu gagal |
| UX-08 | Status selalu punya **warna + teks**, tidak warna saja | Aksesibilitas buta warna |
| UX-09 | Loading > 400ms → skeleton, bukan spinner kosong | Persepsi kecepatan |
| UX-10 | Halaman publik harus bisa dibuka **tanpa login & tanpa JS berat** | Dibagikan di WA, sering dibuka di koneksi lambat |
| UX-11 | Semua teks error berbahasa Indonesia, tanpa istilah teknis | "403" tidak berarti apa pun bagi kapten |
| UX-12 | Setiap halaman publik punya **meta OG image** | Link yang dibagikan di WA tampil menarik → akuisisi |

---

## 10. Skenario UAT (User Acceptance Test)

Skenario ini **wajib lulus** sebelum pilot. Ditulis dari sudut pandang pengguna, bukan kode.

### 10.1 End-to-End (happy path)

| # | Skenario | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| UAT-01 | Daftar tim lengkap | Kapten daftar → buat tim → isi 5 anggota → upload bukti → submit | Status `pending`, admin melihat di antrian |
| UAT-02 | Verifikasi tim | Admin buka SCR-V01 → approve | Status `approved`, kapten dapat email, tim masuk pool |
| UAT-03 | Jadwal & room | Admin buat match → publish → kapten buka T-15 | Room ID terlihat setelah reveal, tercatat di audit |
| UAT-04 | Input & approve skor | Panitia input 12 tim → admin approve | Klasemen update, poin sesuai formula |
| UAT-05 | Klasemen publik | Buka link publik di HP | Tampil < 2s, tanpa login, tanpa data pribadi |
| UAT-06 | Dispute | Kapten ajukan dispute → admin upheld | Nilai berubah, audit log lengkap, notifikasi terkirim |

### 10.2 Negatif (harus gagal dengan benar)

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| UAT-N01 | Kapten tim A akses room match tim B via URL langsung | 403 `ROOM_NOT_PARTICIPANT` |
| UAT-N02 | Panitia approve hasil yang ia input sendiri | 403 `SCORE_SELF_APPROVAL` |
| UAT-N03 | Kapten edit roster setelah turnamen `closed` | 409 `ROSTER_LOCKED`, field read-only |
| UAT-N04 | Input 2 tim dengan placement 1 | 422 `SCORE_PLACEMENT_DUPLICATE` |
| UAT-N05 | UID sama dipakai 2 tim di turnamen sama | 409 `ROSTER_UID_DUPLICATE` + nama tim |
| UAT-N06 | Upload `.exe` sebagai bukti bayar | 415 `UPLOAD_INVALID_TYPE` |
| UAT-N07 | Ubah `points` di body request | Server hitung ulang, manipulasi diabaikan |
| UAT-N08 | Dispute setelah 25 jam | 409 `DISPUTE_WINDOW_CLOSED`, tombol hilang |
| UAT-N09 | Login 6x password salah | Percobaan ke-6 → 429 `AUTH_RATE_LIMITED` |
| UAT-N10 | Buka halaman publik saat turnamen `draft` | 404 (belum dipublikasikan) |
| UAT-N11 | Admin hapus entri audit log | Tidak ada endpoint — 405/404 |
| UAT-N12 | Kapten akses `/admin/verifikasi` | 403 `FORBIDDEN_ROLE` |

### 10.3 Beban & Ketahanan

| # | Skenario | Target |
|---|---|---|
| UAT-P01 | 64 tim registrasi dalam 10 menit bersamaan | Tidak ada 5xx, P95 < 1s |
| UAT-P02 | 300 pengunjung buka klasemen bersamaan | P95 < 2s, server tidak restart |
| UAT-P03 | Upload 50 screenshot 2 MB bersamaan | Semua berhasil atau gagal dengan pesan jelas |
| UAT-P04 | Restore backup ke server bersih | Data lengkap sampai menit terakhir backup |

---

## 11. Kriteria "FSD Selesai"

FSD dinyatakan **baseline** (boleh mulai coding) jika:

- [ ] Setiap User Story Must Have di PRD punya entri di traceability matrix §2.
- [ ] Setiap business rule punya ID dan bisa diuji.
- [ ] Setiap layar kritis punya field, validasi, state, dan kriteria penerimaan.
- [ ] Matriks permission lengkap untuk semua role.
- [ ] Semua state machine tergambar dan tidak ada state "yatim" (tanpa jalan keluar).
- [ ] Kode error untuk semua kegagalan yang bisa diprediksi sudah terdaftar.
- [ ] Tidak ada requirement di FSD yang tidak bisa dilacak ke PRD.
- [ ] QA sudah membaca dan menyatakan skenario UAT cukup untuk memverifikasi.

---

## 12. Handoff ke Dokumen Berikutnya

| Pertanyaan | Dokumen |
|---|---|
| Skema tabel lengkap, index, constraint, migration | **TDD** |
| Endpoint API, request/response, auth header | **API Spec** |
| Pilihan framework, struktur folder, library | **TDD** |
| Desain visual, komponen, spacing, warna | **Design System / Figma** |
| Infrastruktur, CI/CD, monitoring, backup | **Runbook / Ops** |

**Yang FSD sengaja tidak putuskan** (agar tidak mengunci teknologi):
- Klasemen dihitung via SQL view atau di aplikasi → bebas, asalkan hasil identik.
- Session pakai JWT atau cookie → bebas, asalkan BR-AUTH-04 terpenuhi.
- Upload langsung ke object storage atau lewat server → bebas, asalkan validasi NFR terpenuhi.

---

## 13. Change Log

| Versi | Tanggal | Perubahan | Alasan |
|---|---|---|---|
| 1.0 | 2026-02-XX | Draft awal | — |

---

## 14. Pertanyaan Terbuka di Level FSD

| # | Pertanyaan | Dampak jika tidak dijawab | **Status** |
|---|---|---|---|
| F1 | Apakah peserta (bukan kapten) bisa login & lihat jadwal sendiri, atau cukup kapten? | Menentukan perlu/tidaknya alur undangan anggota | ✅ **Bisa — peserta wajib punya akun sendiri** |
| F2 | Berapa lama Room ID tetap terlihat setelah match `selesai`? | Kebijakan retensi & audit | 🔲 Belum dijawab |
| F3 | Apakah panitia boleh melihat UID lengkap, atau cukup 4 digit terakhir? | Privasi vs kebutuhan verifikasi | 🔲 Belum dijawab |
| F4 | Apakah admin bisa membuat tim manual (untuk tim yang tak bisa daftar sendiri)? | Alur operasional hari-H | ✅ **Bisa — admin dapat membuat tim secara manual** |
| F5 | Apa yang terjadi pada tim `approved` jika turnamen di-rollback ke `closed`? | Konsistensi state machine | ⏭️ **Dilewati — belum diputuskan** |

> **Keputusan F1 — Implikasi desain:**
> - Setiap anggota roster wajib punya akun (`user_id` di `team_members` tidak boleh NULL).
> - Kapten mengundang anggota via **link/kode undangan** atau cari via email/UID Game.
> - Anggota yang belum punya akun harus **registrasi dulu**, baru bisa bergabung tim.
> - `team_members.user_id` → **NOT NULL** (berbeda dari skema awal PRD yang mencantumkan `user_id NULL`).
> - Layar baru diperlukan: **SCR-T07 — Undang Anggota** dan **SCR-T08 — Terima Undangan**.

> **Keputusan F4 — Implikasi desain:**
> - Admin punya opsi "Buat Tim Manual" di SCR-V01 atau SCR-D02.
> - Tim yang dibuat manual tetap mengikuti aturan yang sama (nama unik, roster, dll.).
> - Semua aksi admin dalam pembuatan tim manual tercatat di `audit_log`.

---

_Dokumen ini adalah spesifikasi perilaku, bukan spesifikasi teknis. Jika implementasi perlu menyimpang dari FSD, ajukan perubahan ke FSD terlebih dahulu — jangan menyimpang diam-diam di kode._



<!-- END -->
