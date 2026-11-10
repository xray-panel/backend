# Changelog

Формат основан на релизных заметках Remnawave.

## [1.2.1] - 2026-11-10

### What's Changed

* feat(xray): валидатор конфигурации принимает протокол `vmess` — добавлен в `ALLOWED_PROTOCOLS` и `MANAGED_CLIENT_PROTOCOLS`, добавлен тип `VMessInboundConfig` и ветка подстановки клиентов в `addUsersToInbound`
* feat(xray): валидатор принимает транспорт `xdrive` (только для VLESS) — добавлен в `ALLOWED_NETWORKS`

## [1.2.0] - 2026-11-10

### What's Changed

* fix: pass matched SRR rule name when rendering subscription templates
* chore(release): synchronize with Remnawave Panel 3.4.10
