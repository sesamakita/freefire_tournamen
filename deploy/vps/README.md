# ==============================================================================
# PANDUAN CLOUD STREAMING VPS (ARENA TEMPUR)
# Siaran YouTube Otomatis Tanpa Ketergantungan PC Wasit
# ==============================================================================

Arsitektur ini memungkinkan turnamen Free Fire di-broadcast ke YouTube/TikTok secara profesional tanpa panitia/wasit harus memiliki PC gaming di venue.

## Alur Kerja Sistem (Workflow):
1. **Wasit (Spectator di HP Android):**
   - Wasit masuk ke Custom Room Free Fire sebagai Spectator.
   - Layar HP wasit dipancarkan ke IP VPS menggunakan aplikasi broadcaster gratis (seperti **Larix Broadcaster** atau **Prism Live** di Google Play Store).
   - Video feed yang dikirim hanya 1 stream ringan (720p/1080p 3000 Kbps), hemat kuota dan tidak bikin HP panas.

2. **VPS Cloud (Pusat Pengolahan & Penggabungan Grafis):**
   - Server VPS menerima video feed dari HP wasit.
   - VPS menggabungkan feed game dengan **Browser Source Overlay Arena Tempur** (Layar Jeda Iklan Sponsor, Countdown Timer, Running Ticker Bawah, Klasemen).
   - VPS memancarkan hasil akhir ke **YouTube Live** (1080p 60fps) menggunakan koneksi fiber optic data center yang stabil dan tidak pernah drop frame.

3. **Web & APK Arena Tempur Panitia:**
   - Wasit mengontrol siaran langsung dari HP (buka APK Arena Tempur Panitia):
     * Tombol **Mulai Siaran (Go Live)**
     * Tombol **Mulai Jeda Iklan Sponsor (+3 Mnt / +5 Mnt)**
     * Tombol **Ganti Scene (Gameplay / Intermission / Klasemen)**

---

## Spesifikasi VPS yang Dibutuhkan (Saat Nanti Menyewa):
- **CPU:** Minimal 4 vCPU (Disarankan 4-8 vCPU).
- **RAM:** Minimal 8 GB RAM.
- **OS:** Ubuntu 22.04 LTS atau 24.04 LTS.
- **Rekomendasi Provider Terjangkau:**
  * **Hetzner Cloud** (Tipe CPX31 / CCX13, ~€10 - €15 / bulan) -> Sangat stabil untuk streaming.
  * **Contabo Cloud VPS** (Tipe Cloud VPS S/M, ~$6 - $12 / bulan) -> Murah dengan RAM besar.
  * **IDCloudHost / Biznet Gio** -> Provider lokal Indonesia jika ingin ping rendah ke ISP wasit.

---

## Langkah Deploy di VPS (Cukup 1 Kali Saat VPS Sudah Siap):

1. **Login ke Terminal VPS via SSH:**
   ```bash
   ssh root@ip-vps-anda
   ```

2. **Download dan Jalankan Skrip Otomatis:**
   ```bash
   mkdir -p /opt/arena-streaming && cd /opt/arena-streaming
   curl -O https://raw.githubusercontent.com/arenatempur/arena-vps/main/setup.sh # Atau copy folder deploy/vps ini
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Buka Web UI OBS Cloud di Browser:**
   Akses `https://ip-vps-anda:8443` untuk melihat OBS Studio berjalan di cloud dengan antarmuka grafis.
