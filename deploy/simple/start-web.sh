#!/bin/bash
set -a
source /opt/pharmavie/apps/web/.env.local
set +a
cd /opt/pharmavie/apps/web
exec node node_modules/next/dist/bin/next start -p 3000
