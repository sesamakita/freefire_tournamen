#!/usr/bin/env bash
# ==============================================================================
# ARENA TEMPUR - CLOUD STREAMING VPS SETUP SCRIPT
# Otomasi instalasi Docker, MediaMTX RTMP Ingest, dan OBS Cloud di Ubuntu 22.04/24.04
# ==============================================================================

set -e

echo "🚀 [1/4] Memperbarui paket sistem Ubuntu..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git ufw

echo "🐳 [2/4] Menginstal Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    sudo apt-get install -y docker-compose-plugin
fi

echo "🛡️ [3/4] Mengonfigurasi Firewall (UFW Ports)..."
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 1935/tcp   # RTMP Ingest (HP Wasit)
sudo ufw allow 8443/tcp   # Web GUI OBS Cloud
sudo ufw allow 4455/tcp   # OBS WebSocket Remote Control
sudo ufw --force enable

echo "🎬 [4/4] Menjalankan Container Cloud Streaming Engine..."
mkdir -p obs-config
docker compose up -d

echo "=================================================================="
echo "✅ CLOUD STREAMING ENGINE ARENA TEMPUR BERHASIL AKTIF!"
echo "=================================================================="
echo "📡 RTMP Ingest URL untuk HP Wasit: rtmp://$(curl -s ifconfig.me):1935/live/<STREAM_KEY>"
echo "🖥️ Web Antarmuka OBS Cloud: https://$(curl -s ifconfig.me):8443"
echo "🎮 Buka Web Panel Arena Tempur (/admin/<tournamentId>/live) untuk mengatur tujuan siaran YouTube."
echo "=================================================================="
