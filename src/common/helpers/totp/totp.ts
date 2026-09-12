import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP (RFC 6238) для второго фактора входа администратора.
 *
 * Реализация намеренно без внешних зависимостей: нужен только HMAC из
 * node:crypto. Алгоритм проверяется тестовыми векторами из приложения B
 * RFC 6238 — см. scripts/test-totp.sh.
 */

/** Шаг времени и число цифр — значения по умолчанию из RFC 6238. */
const PERIOD_SECONDS = 30;
const DIGITS = 6;
/** Допуск по времени: одно окно назад и одно вперёд. */
const DEFAULT_WINDOW = 1;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Кодирование в base32 без выравнивания — формат, который понимают authenticator-приложения. */
export const base32Encode = (buffer: Buffer): string => {
    let bits = 0;
    let value = 0;
    let output = '';

    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;

        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
};

export const base32Decode = (input: string): Buffer => {
    const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of clean) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error('Invalid base32 character');
        }

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return Buffer.from(bytes);
};

/** Новый секрет: 20 случайных байт, как рекомендует RFC 4226 для HMAC-SHA1. */
export const generateTotpSecret = (): string => base32Encode(randomBytes(20));

const hotp = (key: Buffer, counter: number, digits: number): string => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));

    const digest = createHmac('sha1', key).update(buffer).digest();

    // Динамическое усечение (RFC 4226, раздел 5.3).
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

    return String(binary % 10 ** digits).padStart(digits, '0');
};

/**
 * Код для момента времени. seconds — секунды UNIX; параметр нужен для тестов
 * на фиксированных векторах.
 */
export const generateTotpCode = (secret: string, seconds: number, digits = DIGITS): string =>
    hotp(base32Decode(secret), Math.floor(seconds / PERIOD_SECONDS), digits);

/**
 * Проверка кода с допуском по времени.
 *
 * Сравнение выполняется за постоянное время: иначе по времени ответа можно
 * подбирать код посимвольно.
 */
export const verifyTotpCode = (
    secret: string,
    code: string,
    options: { window?: number; nowMs?: number } = {},
): boolean => {
    const window = options.window ?? DEFAULT_WINDOW;
    const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
    const normalized = code.replace(/\s/g, '');

    if (!/^\d{6}$/.test(normalized)) {
        return false;
    }

    const expected = Buffer.from(normalized);

    for (let offset = -window; offset <= window; offset += 1) {
        const candidate = Buffer.from(
            generateTotpCode(secret, nowSeconds + offset * PERIOD_SECONDS),
        );

        if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
            return true;
        }
    }

    return false;
};

/** Строка для QR-кода: её вводят вручную или сканируют authenticator-приложением. */
export const buildOtpauthUrl = (params: {
    secret: string;
    account: string;
    issuer: string;
}): string => {
    const label = encodeURIComponent(`${params.issuer}:${params.account}`);
    const query = new URLSearchParams({
        secret: params.secret,
        issuer: params.issuer,
        algorithm: 'SHA1',
        digits: String(DIGITS),
        period: String(PERIOD_SECONDS),
    });

    return `otpauth://totp/${label}?${query.toString()}`;
};
