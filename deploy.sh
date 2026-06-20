#!/bin/bash

# Böhme Energia Deploy Script
# Nutze: ./deploy.sh

set -e

echo "🚀 Starte Böhme Energia Deploy..."

# Git Pull
git pull origin main

# Build Images
echo "📦 Baue Docker Images..."
docker build -t boehme-cms:latest ./apps/cms
docker build -t boehme-web:latest ./apps/web

# Stop alte Container
echo "⏹️  Stoppe alte Container..."
docker-compose down || true

# Start neue Container
echo "🏃 Starte neue Container..."
docker-compose up -d

# Warte bis Services ready sind
echo "⏳ Warte auf Services..."
sleep 10

# Status
echo "✅ Deploy fertig!"
docker-compose ps
