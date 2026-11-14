# Changelog

Формат основан на релизных заметках Remnawave.

## [1.2.2] - 2026-11-14

### Security

* fix: prevent pre-auth request body DoS

### What's Changed

* refactor request authentication into the pre-parse HTTP pipeline
* chore(release): synchronize with Remnawave Panel 3.4.11

## [1.2.1] - 2026-11-10

### What's Changed

* feat(xray): валидатор конфигурации принимает протокол `vmess` — добавлен в `ALLOWED_PROTOCOLS` и `MANAGED_CLIENT_PROTOCOLS`, добавлен тип `VMessInboundConfig` и ветка подстановки клиентов в `addUsersToInbound`
* feat(xray): валидатор принимает транспорт `xdrive` (только для VLESS) — добавлен в `ALLOWED_NETWORKS`

## [1.2.0] - 2026-11-10

### What's Changed

* fix: pass matched SRR rule name when rendering subscription templates
* chore(release): synchronize with Remnawave Panel 3.4.10
