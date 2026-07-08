#!/bin/bash
# Déploiement simple PharmaVie — relance API + Web via PM2
set -euo pipefail

cd /opt/pharmavie

echo ">> Build API..."
npm run build -w @pharmavie/api

echo ">> Build Web..."
npm run build -w @pharmavie/web

echo ">> Redémarrage PM2..."
pm2 restart ecosystem.config.cjs --update-env || pm2 start /opt/pharmavie/deploy/simple/ecosystem.config.cjs
pm2 save

echo ">> OK"
pm2 status
