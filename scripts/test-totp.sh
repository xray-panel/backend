#!/usr/bin/env bash
# Проверка TOTP (XLADA) по тестовым векторам RFC 6238.
#
# Движок не имеет зависимостей кроме node:crypto, поэтому компилируется и
# проверяется без базы данных и без запуска приложения.
#
# Запуск из каталога apps/backend: ./scripts/test-totp.sh

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

cd "$ROOT"

npx tsc src/common/helpers/totp/totp.ts src/common/helpers/totp/totp-secret-crypto.ts \
    --outDir "$OUT" --module commonjs --target es2022 --skipLibCheck >/dev/null

cat > "$OUT/run.js" <<'JS'
const totp = require(process.argv[2] + '/totp.js');
const crypto = require(process.argv[2] + '/totp-secret-crypto.js');

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

// --- RFC 6238, приложение B: SHA1, секрет "12345678901234567890", 8 цифр ---
const RFC_SECRET_ASCII = '12345678901234567890';
const rfcSecret = totp.base32Encode(Buffer.from(RFC_SECRET_ASCII, 'ascii'));

const VECTORS = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
];

for (const [seconds, expected] of VECTORS) {
    check(
        `RFC 6238, t=${seconds}`,
        totp.generateTotpCode(rfcSecret, seconds, 8),
        expected,
    );
}

// --- base32 ---
check(
    'base32: кодирование и декодирование обратимы',
    totp.base32Decode(totp.base32Encode(Buffer.from('XLADA test'))).toString('utf8'),
    'XLADA test',
);
check('base32: известное значение', totp.base32Encode(Buffer.from('abc')), 'MFRGG');

// --- проверка кода ---
const secret = totp.generateTotpSecret();
const nowMs = 1_700_000_000_000;
const valid = totp.generateTotpCode(secret, Math.floor(nowMs / 1000));

check('сгенерированный секрет — 32 символа base32', /^[A-Z2-7]{32}$/.test(secret), true);
check('верный код принимается', totp.verifyTotpCode(secret, valid, { nowMs }), true);
check('неверный код отклоняется', totp.verifyTotpCode(secret, '000000', { nowMs }), false);
check('код с пробелами принимается', totp.verifyTotpCode(secret, ` ${valid} `, { nowMs }), true);

// Допуск по времени: предыдущее окно проходит, два окна назад — нет.
const prev = totp.generateTotpCode(secret, Math.floor(nowMs / 1000) - 30);
const twoBack = totp.generateTotpCode(secret, Math.floor(nowMs / 1000) - 60);
check('код из предыдущего окна принимается', totp.verifyTotpCode(secret, prev, { nowMs }), true);
check('код из окна -2 отклоняется', totp.verifyTotpCode(secret, twoBack, { nowMs }), false);
check(
    'окно -2 принимается при window=2',
    totp.verifyTotpCode(secret, twoBack, { nowMs, window: 2 }),
    true,
);

// --- формат ---
check('код из 5 цифр отклоняется', totp.verifyTotpCode(secret, '12345', { nowMs }), false);
check('нецифровой код отклоняется', totp.verifyTotpCode(secret, 'abcdef', { nowMs }), false);
check('пустой код отклоняется', totp.verifyTotpCode(secret, '', { nowMs }), false);

// --- otpauth ---
const url = totp.buildOtpauthUrl({ secret, account: 'admin', issuer: 'XLADA' });
check('otpauth: схема', url.startsWith('otpauth://totp/'), true);
check('otpauth: содержит секрет', url.includes(`secret=${secret}`), true);
check('otpauth: подпись издателя', url.includes('XLADA%3Aadmin'), true);
check('otpauth: период и алгоритм', url.includes('period=30') && url.includes('algorithm=SHA1'), true);

// Разные секреты дают разные коды.
const other = totp.generateTotpSecret();
check(
    'разные секреты дают разные коды',
    totp.generateTotpCode(secret, 1) !== totp.generateTotpCode(other, 1),
    true,
);

// --- шифрование секрета перед сохранением ---
const APP_SECRET = 'test-app-secret-value';
const plain = totp.generateTotpSecret();

const encrypted = crypto.encryptTotpSecret(plain, APP_SECRET);
check('секрет не хранится открытым текстом', encrypted.includes(plain), false);
check('формат версионирован', encrypted.startsWith('v1:'), true);
check(
    'расшифровка возвращает исходный секрет',
    crypto.decryptTotpSecret(encrypted, APP_SECRET),
    plain,
);
check(
    'повторное шифрование даёт другой шифротекст (случайный IV)',
    crypto.encryptTotpSecret(plain, APP_SECRET) !== encrypted,
    true,
);

let wrongKeyFailed = false;
try {
    crypto.decryptTotpSecret(encrypted, 'another-secret');
} catch {
    wrongKeyFailed = true;
}
check('неверный APP_SECRET не расшифровывает', wrongKeyFailed, true);

// Подмена шифротекста должна обнаруживаться: GCM проверяет целостность.
const parts = encrypted.split(':');
const tamperedByte = Buffer.from(parts[3], 'base64');
tamperedByte[0] = tamperedByte[0] ^ 0xff;
const tampered = [parts[0], parts[1], parts[2], tamperedByte.toString('base64')].join(':');

let tamperFailed = false;
try {
    crypto.decryptTotpSecret(tampered, APP_SECRET);
} catch {
    tamperFailed = true;
}
check('подмена шифротекста обнаруживается', tamperFailed, true);

check('определение формата: зашифрованный', crypto.isEncryptedTotpSecret(encrypted), true);
check('определение формата: пустое значение', crypto.isEncryptedTotpSecret(null), false);

console.log(`\nпройдено ${pass}, провалено ${fail}`);
process.exit(fail ? 1 : 0);
JS

node "$OUT/run.js" "$OUT"
