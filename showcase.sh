#!/bin/bash

BACKEND_DIR="$HOME/berkesan-backend"
FRONTEND_DIR="$HOME/berkesan-frontend"
NGROK_DOMAIN="contented-chewable-lemon.ngrok-free.dev"
NGROK_PORT=3000

# 1. Jalankan backend
echo "▶ Menjalankan backend..."
cd "$BACKEND_DIR"
npm start &
BACKEND_PID=$!
sleep 2

# 2. Jalankan ngrok dengan static domain
echo "▶ Menjalankan ngrok..."
ngrok http --domain=$NGROK_DOMAIN $NGROK_PORT > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

echo ""
echo "🎉 Semua siap! Buka URL Vercel kamu untuk showcase."
echo "   Backend URL : https://$NGROK_DOMAIN"
echo "   Backend PID : $BACKEND_PID"
echo "   Ngrok PID   : $NGROK_PID"
echo ""
echo "Tekan Ctrl+C untuk menghentikan semua proses."

# Tunggu sampai Ctrl+C
trap "echo '⏹ Menghentikan...'; kill $BACKEND_PID $NGROK_PID 2>/dev/null; exit" INT
wait
