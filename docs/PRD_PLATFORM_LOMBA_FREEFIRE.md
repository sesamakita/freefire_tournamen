# PRD — Platform Lomba Free Fire

| Field | Isi |
|---|---|
| **Nama Produk** | (working title) **ArenaKu** — Tournament Management Platform |
| **Versi Dokumen** | 1.0 (Draft untuk review) |
| **Tanggal** | 2026-02-XX |
| **Pemilik Produk** | _[isi nama]_ |
| **Status** | Draft → Review → Approved |
| **Target Rilis MVP** | 6 minggu dari approval |

---

## 1. Ringkasan Eksekutif

ArenaKu adalah **platform administrasi turnamen** untuk game battle royale mobile (fokus awal: Free Fire). Platform ini **tidak menyentuh gameplay** — semua pertandingan tetap dimainkan di dalam Free Fire melalui Custom Room. ArenaKu mengurus lapisan di sekitarnya: registrasi tim, verifikasi pembayaran, penjadwalan match, distribusi Room ID, input & verifikasi skor, klasemen, dan bracket publik.

**Masalah inti:** penyelenggara turnamen komunitas saat ini mengelola 16–32 tim dengan Google Form + Google Sheets + grup WhatsApp. Pendekatan ini rusak pada titik yang dapat diprediksi: roster ganda, bukti bayar hilang, skor diubah tanpa jejak, sengketa tanpa bukti, peserta tidak tahu jadwal.

**Nilai yang dijual:** bukan "aplikasi turnamen", tapi **kredibilitas**. Satu sumber kebenaran untuk skor, dengan jejak audit yang bisa ditunjukkan ke peserta saat sengketa.

**Model bisnis:** SaaS per-event untuk penyelenggara (Rp 150rb–500rb/turnamen) atau flat bulanan untuk liga rutin. Fase 2: multi-tenant.

---

## 2. Latar Belakang & Bukti Masalah

### 2.1 Kondisi saat ini (as-is)

| Tahap | Alat sekarang | Titik gagal |
|---|---|---|
| Pendaftaran | Google Form | Duplikat tim, roster asal, tidak ada validasi UID |
| Pembayaran | Transfer + bukti ke WA pribadi | Bukti hilang di chat, status tidak jelas |
| Jadwal | Posting gambar di grup WA | Tenggelam chat lain, peserta klaim "tidak tahu" |
| Room ID | Broadcast WA | Bocor ke tim lain |
| Hasil | Screenshot dikirim ke panitia | Input manual ke Sheet, salah ketik |
| Klasemen | Google Sheets manual | Formula rusak, versi berbeda antar panitia |
| Sengketa | Debat di grup WA | Tidak ada bukti, keputusan terasa sewenang-wenang |

### 2.2 Dampak (asumsi awal — **wajib divalidasi di 3 turnamen pertama**)

- 20–30% waktu panitia habis menjawab pertanyaan berulang.
- 1 dari 4 turnamen mengalami sengketa skor tanpa bukti.
- 5–10% slot tim hangus karena pembayaran tidak terverifikasi sampai hari-H.

> **Catatan kejujuran:** angka-angka ini hipotesis, bukan hasil riset. Fase Discovery (Minggu 0) harus mengonfirmasi lewat wawancara 5 penyelenggara. Jika ternyata penyebab utama bukan ini, scope harus diubah sebelum coding.

### 2.3 Mengapa sekarang

Turnamen komunitas FF tumbuh cepat (kampung, sekolah, komunitas Discord, liga antar-RT), tapi tooling-nya generik. Tidak ada produk yang dirancang khusus untuk alur BR dengan poin placement + kill.

---

## 3. Tujuan & Metrik Keberhasilan

### 3.1 Product Goals (berurut prioritas)

| # | Goal | Alasan |
|---|---|---|
| G1 | Menghilangkan input skor ganda & salah ketik | Sumber utama sengketa |
| G2 | Transparansi penuh bagi peserta (jadwal, room, skor, status bayar) | Kurangi ~70% beban tanya-jawab |
| G3 | Setiap perubahan skor dapat diaudit | Kredibilitas penyelenggara |
| G4 | 32 tim dijalankan 3 panitia | Skalabilitas operasional |

### 3.2 Success Metrics (diukur setelah 3 turnamen)

| Metrik | Baseline (manual) | Target MVP |
|---|---|---|
| Waktu input+verifikasi hasil per match | 15–20 menit | **< 5 menit** |
| Sengketa skor tak terselesaikan | 25% turnamen | **0** |
| Pertanyaan berulang via WA | ~60/hari | **< 15/hari** |
| Tim gagal tampil karena tak tahu jadwal | 5–10% | **< 2%** |
| Setup turnamen baru (nol → open registration) | 2–3 jam | **< 20 menit** |
| Panitia untuk 32 tim | 6–8 orang | **3 orang** |

### 3.3 Guardrail Metrics

- Halaman klasemen publik < 2 detik pada 3G.
- Nol kebocoran Room ID ke tim tidak berhak.
- Nol perubahan skor yang tidak tercatat di `audit_log`.

---

## 4. Non-Goals (Eksplisit TIDAK dikerjakan)

| Non-Goal | Alasan |
|---|---|
| ❌ Baca memori / sniff paket / overlay ke klien FF | Pelanggaran ToS + risiko pidana (UU ITE). Merusak kredibilitas |
| ❌ Anti-cheat level klien | Bukan kapasitas kami; domain Garena |
| ❌ Jual diamond / top-up / akun | Regulasi berbeda, margin tipis, bukan core |
| ❌ Menjadi operator turnamen | Konflik kepentingan dengan pelanggan |
| ❌ Mobile native app di MVP | Web responsive cukup; 2x biaya, 0.2x manfaat |
| ❌ Chat/forum internal | Semua sudah punya WA/Discord |
| ❌ Live streaming di MVP | Kompleks & mahal; embed YouTube cukup |
| ❌ OCR otomatis di MVP | Akurasi belum terbukti; human-in-the-loop dulu |
| ❌ Multi-game (PUBG, ML) di MVP | Fokus. Skema DB disiapkan agar mudah ditambah |
| ❌ Microservices, K8s, WebSocket real-time | Solusi untuk masalah yang belum ada |

---

## 5. Persona & Peran

### 5.1 Persona

| Persona | Deskripsi | Yang dia pedulikan | Frustrasi utama |
|---|---|---|---|
| **P1 — Penyelenggara (Organizer)** | 22–35 th, jalankan turnamen komunitas 2–4x/bulan, dibantu 2–4 teman | Reputasi, turnamen lancar, tanpa drama | Sengketa skor, panitia keliru input, peserta komplain |
| **P2 — Panitia (Staff)** | Relawan, ikut bantu di hari-H, bukan teknis | Instruksi jelas, kerja cepat | Tools berantakan, harus input ulang |
| **P3 — Kapten Tim** | 16–25 th, koordinasi 4–6 orang | Kepastian jadwal & room, skor adil | Tidak tahu kapan main, skor diubah tanpa alasan |
| **P4 — Pemain** | 15–25 th, hanya ikut main | Jadwal, hasil | Informasi hanya ada di kapten |
| **P5 — Penonton/Komunitas** | Lihat bracket & klasemen | Update cepat, bisa dibagikan | Harus tanya manual |

### 5.2 Peran sistem (RBAC)

| Role | Boleh | **Tidak boleh** |
|---|---|---|
| `owner` | Semua + kelola admin lain + billing | — |
| `admin` | Semua operasional, **approve skor**, ubah roster | Hapus turnamen, kelola billing |
| `panitia` | Input skor, upload bukti, kelola jadwal & room | **Approve skor**, ubah roster |
| `kapten` | Kelola roster timnya, submit bukti, lihat room ID | Lihat data tim lain, ubah skor |
| `peserta` | Lihat jadwal, bracket, klasemen timnya | Semua operasi tulis |
| `publik` (anon) | Lihat bracket & klasemen turnamen berstatus publik | Semua data pribadi (email, WA, UID) |

**Aturan pemisahan tugas (SoD) yang tidak boleh dilanggar:**
> Panitia yang menginput skor **tidak boleh** menjadi approver untuk match yang sama. Sistem harus menolak, bukan sekadar mengingatkan.

---

## 6. User Stories & Prioritas (MoSCoW)

### 6.1 Must Have (MVP — tanpa ini produk tidak layak rilis)

**Registrasi & Tim**
- US-01 · Sebagai kapten, saya bisa daftar akun dengan email + password agar bisa mengelola tim.
- US-02 · Sebagai kapten, saya bisa membuat tim untuk turnamen yang sedang `open` dan mengisi nama tim + logo.
- US-03 · Sebagai kapten, saya bisa menambah/mengubah anggota roster (IGN, UID, role, status substitute) sebelum roster dikunci.
- US-04 · Sebagai kapten, saya bisa mengunggah bukti pembayaran entry fee (JPG/PNG/PDF, maks 5 MB).
- US-05 · Sebagai sistem, saya menolak registrasi jika nama tim duplikat dalam turnamen yang sama atau UID sudah terdaftar di tim lain pada turnamen yang sama.

**Verifikasi**
- US-06 · Sebagai admin, saya bisa melihat daftar tim `pending` beserta bukti bayar, lalu approve/reject dengan alasan wajib saat reject.
- US-07 · Sebagai kapten, saya menerima status verifikasi (approved/rejected + alasan) di halaman tim saya.

**Jadwal & Room**
- US-08 · Sebagai admin, saya bisa membuat match dan menetapkan tim ke slot.
- US-09 · Sebagai admin, saya bisa mengisi Room ID & password per match (input manual — FF tidak punya API).
- US-10 · Sebagai kapten, saya hanya bisa melihat Room ID untuk match yang tim saya ikuti, dan hanya setelah match berstatus `published`.

**Skor**
- US-11 · Sebagai panitia, saya bisa input `placement` dan `kills` per tim per match, plus unggah screenshot scoreboard.
- US-12 · Sebagai admin (orang berbeda), saya bisa approve/reject hasil yang diinput panitia.
- US-13 · Sebagai sistem, saya menghitung `points` dari `placement` + `kills` memakai formula turnamen, dan **tidak** mengizinkan input poin manual.

**Klasemen & Publik**
- US-14 · Sebagai publik, saya bisa membuka klasemen read-only tanpa login, dengan tie-breaker konsisten.
- US-15 · Sebagai publik, saya bisa melihat bracket/jadwal yang bisa dibagikan lewat link.

**Audit & Sengketa**
- US-16 · Sebagai admin, saya bisa melihat riwayat perubahan skor (siapa, kapan, dari apa ke apa).
- US-17 · Sebagai kapten, saya bisa mengajukan dispute hasil maksimal 1x24 jam setelah approve, dengan alasan + bukti.

**Roster Lock**
- US-18 · Sebagai sistem, saya mengunci roster saat turnamen berubah ke `closed`; perubahan setelahnya hanya lewat admin dan tercatat di audit log.

### 6.2 Should Have (Fase 2 — setelah 3 turnamen berjalan)

- US-19 · Notifikasi WhatsApp otomatis (jadwal, reminder H-1, hasil approved).
- US-20 · Multi-tenant: satu penyelenggara bisa punya banyak turnamen dengan branding sendiri.
- US-21 · Export klasemen ke CSV/PDF untuk sponsor & media.
- US-22 · Bracket visual (bukan hanya tabel) untuk format eliminasi.
- US-23 · Halaman profil tim publik (histori, win rate).

### 6.3 Could Have (Fase 3 — kalau ada permintaan nyata)

- US-24 · OCR screenshot scoreboard → usulan skor (tetap human approve).
- US-25 · Embed live stream YouTube per match.
- US-26 · API publik read-only untuk komunitas (statistik, bracket).
- US-27 · Sistem poin kustom per turnamen (formula builder).

### 6.4 Won't Have

Lihat Non-Goals §4.

---

## 7. Functional Requirements (detail perilaku)

### 7.1 Siklus Hidup Turnamen

```
draft ──► open ──► closed ──► running ──► done
```

| Transisi | Syarat | Efek samping |
|---|---|---|
| `draft → open` | Minimal 1 match config + formula poin valid | Halaman publik muncul, registrasi terbuka |
| `open → closed` | Manual oleh admin | **Roster lock**, registrasi ditutup, tim `pending` di-`reject` otomatis dengan alasan |
| `closed → running` | Minimal 2 tim `verified` | Room ID boleh dipublish |
| `running → done` | Semua match `selesai` & hasil `approved` | Klasemen final dikunci, tombol dispute hilang |

**Aturan:** transisi hanya maju. Pengecualian satu-satunya: `running → closed` oleh `owner`, dengan alasan wajib + audit log.

### 7.2 Formula Poin (konfigurabel per turnamen, bukan hardcode)

```yaml
placement_points: { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 }
kill_point: 1
# total = placement_points[placement] + (kills x kill_point)
```

- Disimpan sebagai JSONB di `tournaments.point_config`, **bukan** kolom hardcode.
- `points` **selalu dihitung server**; nilai dari client diabaikan.
- Setelah ada hasil `approved`, formula **tidak boleh** diubah. Jika harus, admin melakukan "recalculate" yang tercatat di audit log dan menandai hasil terkait `recalculated`.

### 7.3 Tie-Breaker (harus identik dengan rulebook)

`total_points DESC` → `total_kills DESC` → `best_placement ASC` → `earliest_submit ASC`.
Jika masih seri, tampilkan **shared rank** — jangan pakai tie-breaker acak.

### 7.4 Alur Verifikasi Skor (dual control)

```
Panitia input (placement, kills, screenshot)
        │
        ▼
  results.status = 'pending'
        │
        ▼
  Admin (BUKAN panitia input) review screenshot
        │
   ┌────┴────┐
   ▼         ▼
approved   rejected (+ alasan wajib)
   │         │
   ▼         ▼
klasemen   kembali ke panitia untuk revisi
```

**Validasi wajib saat input:**
- `placement` unik per match (tidak boleh dua tim placement 1).
- `kills` ≥ 0 dan ≤ 40 (deteksi salah ketik).
- Screenshot wajib ada sebelum submit.
- Match harus berstatus `ongoing` atau `selesai`.

### 7.5 Distribusi Room ID (titik keamanan paling sensitif)

| Aturan | Detail |
|---|---|
| Visibilitas | Hanya kapten & anggota tim peserta match tersebut |
| Waktu | Hanya setelah match `published` dan ≥ 15 menit sebelum jadwal |
| Audit | Setiap kali Room ID dibuka, tercatat (`who, when, match_id`) |
| Rotasi | Admin bisa mengganti Room ID; perubahan tercatat & notifikasi ke peserta |
| Publik | **Tidak pernah** tampil di halaman publik, termasuk di API response |

> Jika aturan ini dilanggar, tim bisa masuk room yang salah dan turnamen kacau. Ini requirement **P0**.

### 7.6 Dispute

- Kapten submit dispute 1x per match, dalam 24 jam setelah hasil `approved`.
- Wajib alasan (min 50 karakter) + bukti opsional.
- Status berubah ke `disputed`; klasemen **tetap** menampilkan nilai approved sampai admin memutuskan.
- Keputusan admin: `upheld` (hasil berubah, alasan wajib) atau `rejected` (hasil tetap).
- Semua langkah tercatat di `audit_log` dan terlihat oleh kedua pihak.

### 7.7 Audit Log (immutable)

Dicatat untuk: approve/reject tim, perubahan roster, input/approve/reject/recalculate hasil, perubahan Room ID, transisi status turnamen, perubahan role user, akses Room ID.

| Field | Isi |
|---|---|
| `actor_id` | Siapa yang melakukan |
| `action` | `score.approve`, `team.reject`, dst. |
| `entity` + `entity_id` | Objek yang disentuh |
| `before` / `after` | Snapshot JSON |
| `reason` | Wajib untuk aksi destruktif |
| `ip`, `user_agent`, `created_at` | Konteks |

**Aturan:** tabel `audit_log` **append-only**. Tidak ada endpoint update/delete. Retensi minimum 2 tahun.

### 7.8 Notifikasi (MVP: minimal & andal)

| Event | Kanal MVP | Kanal Fase 2 |
|---|---|---|
| Tim approved/rejected | In-app + email | + WA |
| Jadwal match dipublish | In-app | + WA |
| Room ID tersedia | In-app | + WA |
| Hasil approved | In-app | + WA |
| Reminder H-1 | — | WA |
| Dispute diputuskan | In-app + email | + WA |

**Prinsip:** notifikasi **tidak boleh** jadi satu-satunya sumber informasi. Semua harus bisa dilihat ulang di dashboard (in-app = source of truth). WA bisa gagal; dashboard tidak.

### 7.9 Requirement Non-Fungsional

| Kategori | Requirement |
|---|---|
| **Performance** | Klasemen publik < 2s (P75, 3G). API P95 < 500ms |
| **Skala MVP** | 64 tim, 500 user, 20 match/turnamen, 5 turnamen aktif |
| **Availability** | 99% (hari-H tidak boleh down; downtime terjadwal OK) |
| **Browser** | Chrome/Edge/Safari 2 versi terakhir, **mobile-first** |
| **Keamanan** | Password hash Argon2id, session httpOnly cookie, rate limit login 5/menit/IP |
| **Privasi** | UID & nomor WA **tidak pernah** tampil di halaman publik |
| **Upload** | Maks 5 MB/file, whitelist MIME + validasi magic bytes, simpan di object storage (bukan disk VPS) |
| **Backup** | Harian otomatis, retensi 14 hari, **restore drill wajib sebelum hari-H** |
| **Aksesibilitas** | Kontras ≥ 4.5:1, semua form punya label, target tap ≥ 44px |

---

## 8. Alur Pengguna Utama (happy path)

### 8.1 Penyelenggara menyiapkan turnamen (target: < 20 menit)

```
Login → "Buat Turnamen"
  → isi nama, tanggal, max tim, entry fee, formula poin
  → upload logo & banner
  → tambah panitia (undang via email/WA)
  → klik "Buka Registrasi"
  → bagikan 1 link publik
```

### 8.2 Kapten mendaftar (target: < 10 menit)

```
Buka link → Daftar akun → Buat tim
  → isi roster 4 inti + 1 cadangan (IGN + UID)
  → upload bukti bayar
  → submit → status "Menunggu verifikasi"
  → terima email saat approved
```

### 8.3 Hari-H

```
Admin publish jadwal → kapten lihat Room ID (T-15 menit)
  → match dimainkan di Free Fire
  → panitia input skor + screenshot
  → admin approve
  → klasemen update otomatis (delay < 10 detik)
  → publik lihat di link yang sama
```

---

## 9. Model Data (ringkas — detail di dokumen teknis)

```
users(id, email, password_hash, nama, no_wa, role_global, created_at)

tournaments(id, organizer_id, nama, game, format, entry_fee,
            point_config JSONB, max_teams, tgl_mulai, tgl_selesai,
            status, is_public, created_at)

teams(id, tournament_id, nama, kapten_user_id, logo_url,
      payment_status, verification_status, rejection_reason)

team_members(id, team_id, user_id NOT NULL, ign, uid_game, role_tim,
             is_substitute, invite_status, created_at)
             -- invite_status: 'pending' | 'accepted' | 'declined'

matches(id, tournament_id, round, grup, jadwal, room_id, room_pass,
        status, published_at)

match_teams(id, match_id, team_id, slot)

results(id, match_id, team_id, placement, kills, points,
        screenshot_url, submitted_by, verified_by, verified_at,
        status, rejection_reason)

disputes(id, result_id, team_id, alasan, bukti_url, status, decided_by)

audit_log(id, actor_id, action, entity, entity_id, before JSONB,
          after JSONB, reason, ip, user_agent, created_at)
```

**Index wajib:**
- `UNIQUE(tournament_id, LOWER(nama))` pada `teams` — cegah duplikat tim.
- `UNIQUE(tournament_id, uid_game)` pada `team_members` — cegah UID ganda.
- `UNIQUE(match_id, team_id)` dan `UNIQUE(match_id, placement)` pada `results`.
- `INDEX(match_id, status)`, `INDEX(tournament_id, status)`.

**Klasemen dihitung on-the-fly** (query/view), **tidak** disimpan sebagai tabel — supaya tidak ada dua sumber kebenaran.

---

## 10. Rencana Rilis

| Fase | Durasi | Isi | Gate (harus lulus sebelum lanjut) |
|---|---|---|---|
| **M0 — Discovery** | 1 minggu | Wawancara 5 penyelenggara, validasi asumsi §2.2, finalisasi rulebook poin | 3 dari 5 mengonfirmasi masalah prioritas sama |
| **M1 — Core** | 2 minggu | Auth, turnamen, tim, roster, upload bukti, verifikasi admin | Bisa daftar 16 tim end-to-end |
| **M2 — Match & Skor** | 2 minggu | Match, room ID, input skor, dual approval, klasemen | 1 turnamen uji internal selesai |
| **M3 — Publik & Polish** | 1 minggu | Halaman publik, bracket, audit log UI, mobile polish | Lighthouse mobile ≥ 85 |
| **M4 — Pilot** | 1 minggu | Jalankan 1 turnamen nyata 16 tim | 0 sengketa tak terselesaikan |

**Total ke pilot: ~7 minggu.** Setelah pilot, **berhenti dan evaluasi** — jangan lanjut Fase 2 sebelum ada bukti orang mau bayar.

---

## 11. Risiko & Mitigasi

| # | Risiko | Dampak | Prob. | Mitigasi |
|---|---|---|---|---|
| R1 | Penyelenggara tidak mau bayar (kultur "gratis") | Bisnis gagal | Tinggi | Pilot gratis 1x, lalu tawarkan harga per-event kecil; ukur willingness-to-pay sejak M0 |
| R2 | Server down di hari-H | Reputasi hancur permanen | Sedang | Load test 3x beban puncak, Cloudflare cache, runbook + on-call, backup teruji |
| R3 | Tim tetap pakai WA, tidak mau pakai sistem | Adopsi gagal | Sedang | Onboarding 5 menit, dashboard kapten yang benar-benar berguna, posisikan sebagai pelengkap WA |
| R4 | Room ID bocor | Turnamen kacau | Sedang | Kontrol akses ketat (§7.5), audit akses, rotasi room |
| R5 | Skor diubah diam-diam → kepercayaan hilang | Fatal | Rendah | Dual approval + audit log immutable + histori terlihat peserta |
| R6 | Scope creep (minta streaming, chat, OCR) | Tidak pernah rilis | **Tinggi** | Non-Goals §4 disepakati di awal; semua permintaan masuk backlog Fase 2/3 |
| R7 | Garena mengubah kebijakan custom room | Fitur inti terdampak | Rendah | Desain agar Room ID selalu input manual — tidak pernah bergantung pada API |
| R8 | Satu orang jadi bottleneck (bus factor) | Proyek mati | Sedang | Dokumentasi, CI/CD, tidak ada konfigurasi "hanya ada di laptop saya" |

---

## 12. Pertanyaan Terbuka (harus dijawab sebelum M1)

| # | Pertanyaan | Pemilik | Deadline | **Status** |
|---|---|---|---|---|
| Q1 | Model harga: per-event, langganan, atau % dari entry fee? | Product | M0 | 🔲 Belum dijawab |
| Q2 | Apakah semua pemain wajib punya akun, atau cukup kapten saja? | Product + UX | M0 | ✅ **Semua pemain wajib punya akun** |
| Q3 | Berapa lama data turnamen disimpan setelah selesai? | Legal/Product | M1 | 🔲 Belum dijawab |
| Q4 | Siapa bertanggung jawab jika sengketa berlanjut di luar platform? | Business | M0 | 🔲 Belum dijawab |
| Q5 | Perlu payment gateway (Midtrans/Xendit) di MVP, atau transfer manual cukup? | Product | M1 | ✅ **Transfer manual via QRIS** (tanpa payment gateway di MVP) |
| Q6 | Apakah turnamen berbayar butuh legalitas/izin tertentu di Indonesia? | Legal | M1 | ⏭️ **Dilewati — belum diputuskan** |

> **Keputusan Q2 — Implikasi:** Setiap anggota roster wajib punya akun terdaftar. Kapten mengundang anggota via email/link. Lihat FSD §F1 untuk detail alur undangan.
>
> **Keputusan Q5 — Implikasi:** Bukti bayar berupa screenshot/foto bukti transfer QRIS yang diunggah manual oleh kapten. Admin verifikasi secara manual. Tidak butuh webhook/integrasi payment gateway di MVP.

---

## 13. Definition of Done (MVP)

MVP dinyatakan selesai jika **semua** ini terpenuhi:

- [ ] 1 turnamen nyata 16 tim berjalan penuh tanpa campur tangan database manual.
- [ ] 100% hasil skor melewati dual approval.
- [ ] 100% perubahan tercatat di `audit_log` (diverifikasi sampling 20 entri).
- [ ] 0 kebocoran Room ID (diuji dengan akses dari akun tim lain).
- [ ] Restore backup berhasil diuji di environment bersih.
- [ ] Halaman klasemen publik < 2s pada 3G.
- [ ] 3 panitia bisa menjalankan 1 hari turnamen tanpa saling kirim spreadsheet.
- [ ] Dokumentasi tersedia: runbook hari-H, panduan kapten, panduan admin.

---

## 14. Lampiran: Prinsip Desain Produk

1. **Skor tidak pernah masuk klasemen tanpa dua manusia menyetujui.** Ini bukan fitur — ini fondasi kepercayaan.
2. **Jangan bikin chat.** Semua orang sudah punya WA/Discord. Menangkan pada hal yang chat tidak bisa: kebenaran & jejak.
3. **Manual > otomatis yang salah.** OCR 85% akurat lebih berbahaya daripada input manual yang terverifikasi.
4. **Mobile-first, bukan mobile-friendly.** 90% peserta membuka dari HP di sela-sela aktivitas.
5. **Halaman publik harus bisa dibagikan sebagai satu link.** Itu kanal akuisisi organik terbaik.
6. **Setiap tombol destruktif wajib punya alasan.** Alasan = akuntabilitas = kepercayaan.
7. **Tambah komponen hanya ketika ada trigger nyata**, bukan karena "biar scalable".

---

_Dokumen ini adalah living document. Setiap perubahan scope setelah M1 harus melalui change request dengan alasan tertulis._

