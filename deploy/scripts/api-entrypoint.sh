#!/bin/sh
set -e

echo ">> Prisma db push..."
npx prisma db push --skip-generate

echo ">> Démarrage API..."
exec node dist/src/main.js
