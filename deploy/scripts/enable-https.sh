#!/usr/bin/env bash
set -euo pipefail
# Выпускает SSL-сертификаты Let's Encrypt для доменов, как только их DNS
# указывает на этот VPS (89.108.66.148). Запускать на сервере под root.
#
# Использование:
#   bash enable-https.sh smeg.am www.smeg.am
#   bash enable-https.sh smeg.previewsite.cc        # когда долетит DNS
#
# Можно передать несколько доменов сразу — они попадут в один сертификат.

if [ "$#" -lt 1 ]; then
  echo "Укажи хотя бы один домен. Пример: bash enable-https.sh smeg.am www.smeg.am"
  exit 1
fi

EMAIL="admin@smeg.am"   # контакт для уведомлений Let's Encrypt

# Проверяем, что каждый домен реально резолвится на наш IP
MYIP="89.108.66.148"
for d in "$@"; do
  ip="$(dig +short "$d" A | tail -1)"
  if [ "$ip" != "$MYIP" ]; then
    echo "ВНИМАНИЕ: $d сейчас указывает на '${ip:-пусто}', а не на $MYIP."
    echo "Сертификат не выпустится, пока DNS не долетит. Прерываю."
    exit 1
  fi
done

mkdir -p /var/www/certbot

# Собираем -d флаги
ARGS=()
for d in "$@"; do ARGS+=( -d "$d" ); done

certbot --nginx --non-interactive --agree-tos -m "$EMAIL" \
  --redirect "${ARGS[@]}"

echo "Готово. Проверка автопродления:"
certbot renew --dry-run || true
systemctl reload nginx
