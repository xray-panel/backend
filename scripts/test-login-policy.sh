#!/usr/bin/env bash
# Проверка политики ограничения попыток входа (XLADA).
#
# Модуль политики не имеет импортов, поэтому компилируется и проверяется
# без поднятия Redis и NestJS. Запуск из каталога apps/backend:
#     ./scripts/test-login-policy.sh

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

cd "$ROOT"

npx tsc src/modules/auth/login-attempts.policy.ts \
    --outDir "$OUT" --module commonjs --target es2022 --skipLibCheck >/dev/null

cat > "$OUT/run.js" <<'JS'
const p = require(process.argv[2] + '/login-attempts.policy.js');
let pass = 0;
let fail = 0;

const check = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(
        `${ok ? 'OK  ' : 'FAIL'} ${name}: ${JSON.stringify(actual)}` +
            (ok ? '' : ` (ожидалось ${JSON.stringify(expected)})`),
    );
    ok ? pass++ : fail++;
};

// Порог пары «логин + IP»
check('4 неудачи — блокировки нет', p.shouldLockAccount(4, 4), false);
check('5 неудач — блокировка есть', p.shouldLockAccount(5, 5), true);

// Порог по IP
check('19 попыток с IP — блокировки нет', p.shouldLockIp(19), false);
check('20 попыток с IP — блокировка есть', p.shouldLockIp(20), true);

// Порог по аккаунту: защита от распределённого перебора
check('49 по аккаунту — нет', p.shouldLockAccount(1, 49), false);
check('50 по аккаунту — есть', p.shouldLockAccount(1, 50), true);

// Эскалация длительности блокировки
check('уровень 1 = 15 мин', p.lockDurationSeconds(1), 900);
check('уровень 2 = 30 мин', p.lockDurationSeconds(2), 1800);
check('уровень 3 = 60 мин', p.lockDurationSeconds(3), 3600);
check('уровень 9 ограничен часом', p.lockDurationSeconds(9), 3600);
check('уровень 0 не ломает расчёт', p.lockDurationSeconds(0), 900);

// Остаток блокировки
check('остаток 10 c', p.remainingLockSeconds(10_000, 0), 10);
check('истёкшая блокировка = 0', p.remainingLockSeconds(1_000, 5_000), 0);
check('ровно истёкшая = 0', p.remainingLockSeconds(5_000, 5_000), 0);

console.log(`\nпройдено ${pass}, провалено ${fail}`);
process.exit(fail ? 1 : 0);
JS

node "$OUT/run.js" "$OUT"
