#!/usr/bin/env bash
set -euo pipefail

site_host=${1:?Usage: bootstrap.sh SITE_IP COMMIT ARCHIVE}
commit=${2:?Commit is required}
archive=${3:?Archive path is required}

[[ "$site_host" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
[[ "$commit" =~ ^[a-f0-9]{40}$ ]]
test -f /etc/neoavlod-ai/.env
test -f "$archive"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y --no-install-recommends nodejs nginx python3-venv ca-certificates
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'

if ! id -u neoavlod-ai >/dev/null 2>&1; then
    useradd --system --user-group --home-dir /opt/neoavlod-ai --shell /usr/sbin/nologin neoavlod-ai
fi

release_root=/opt/neoavlod-ai/releases
release="$release_root/$commit"
install -d -m 0755 "$release_root" /var/www/neoavlod-acme
if [ ! -d "$release" ]; then
    staging=$(mktemp -d "$release_root/.incoming.XXXXXX")
    trap 'rm -rf "$staging"' EXIT
    tar -xzf "$archive" --no-same-owner -C "$staging"
    chmod 0755 "$staging"
    (cd "$staging" && node --test)
    mv -T "$staging" "$release"
    trap - EXIT
fi

http_config=/etc/nginx/sites-available/neoavlod-ai-http
https_config=/etc/nginx/sites-available/neoavlod-ai-https
sed "s/__SITE_HOST__/$site_host/g" "$release/deploy/nginx-http.conf" > "$http_config"
ln -sfn "$http_config" /etc/nginx/sites-enabled/neoavlod-ai-http
nginx -t
systemctl enable --now nginx
systemctl reload nginx

certbot=/opt/neoavlod-certbot/bin/certbot
if [ ! -x "$certbot" ]; then
    python3 -m venv /opt/neoavlod-certbot
    /opt/neoavlod-certbot/bin/python -m pip install --disable-pip-version-check 'certbot==5.10.0'
fi
"$certbot" certonly --non-interactive --agree-tos --register-unsafely-without-email \
    --keep-until-expiring --preferred-profile shortlived --webroot \
    --webroot-path /var/www/neoavlod-acme --ip-address "$site_host" --cert-name "$site_host"

sed "s/__SITE_HOST__/$site_host/g" "$release/deploy/nginx-https.conf" > "$https_config"
ln -sfn "$https_config" /etc/nginx/sites-enabled/neoavlod-ai-https
nginx -t

link="/opt/neoavlod-ai/.current-$commit"
ln -sfn "$release" "$link"
mv -Tf "$link" /opt/neoavlod-ai/current
install -m 0644 "$release/deploy/neoavlod-ai.service" /etc/systemd/system/neoavlod-ai.service
install -m 0644 "$release/deploy/neoavlod-cert-renew.service" /etc/systemd/system/neoavlod-cert-renew.service
install -m 0644 "$release/deploy/neoavlod-cert-renew.timer" /etc/systemd/system/neoavlod-cert-renew.timer
systemctl daemon-reload
systemctl enable neoavlod-ai
systemctl restart neoavlod-ai
systemctl enable --now neoavlod-cert-renew.timer
systemctl reload nginx
curl --retry 4 --retry-connrefused --retry-delay 1 --fail --silent --show-error \
    http://127.0.0.1:4173/ -o /dev/null
printf 'Deployed commit %s\n' "$commit"
