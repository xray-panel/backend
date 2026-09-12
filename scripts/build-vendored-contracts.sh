#!/usr/bin/env bash
# Сборка локальных контрактных библиотек бэкенда XPANEL.
#
# Раньше эти пакеты брались из npm под скоупом вендора:
#   @remnawave/hashed-set    — теперь libs/hashed-set (лежит в этом репозитории)
#   @remnawave/node-contract — теперь vendor/node-contract (копия из apps/node)
#
# Оба объявлены как зависимости file:, поэтому их нужно собрать до того, как
# TypeScript и rspack начнут их разрешать. Запускается из postinstall, а также
# вручную при обновлении контракта ноды.

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TSC="$ROOT/node_modules/.bin/tsc"

if [[ ! -x "$TSC" ]]; then
    echo "не найден tsc в $TSC — сначала установите зависимости бэкенда" >&2
    exit 1
fi

build_hashed_set() {
    echo "сборка: hashed-set"
    (
        cd "$ROOT/libs/hashed-set"
        rm -rf build
        "$TSC" -p tsconfig.backend.json
        "$TSC" -p tsconfig.frontend.json
    )
}

build_node_contract() {
    echo "сборка: node-contract"
    (
        cd "$ROOT/vendor/node-contract"
        rm -rf build
        "$TSC" -p tsconfig.json
    )
}

build_hashed_set
build_node_contract

echo "локальные контракты собраны"
