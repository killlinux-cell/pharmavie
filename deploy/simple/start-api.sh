#!/bin/bash
set -a
source /opt/pharmavie/apps/api/.env
set +a
cd /opt/pharmavie/apps/api
exec node dist/src/main.js
