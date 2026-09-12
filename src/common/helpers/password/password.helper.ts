import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
    password: string | Buffer,
    salt: string | Buffer,
    keylen: number,
) => Promise<Buffer>;

/**
 * Хеширование пароля администратора.
 *
 * Схема: HMAC-SHA256(пароль, APP_SECRET), затем scrypt со случайной солью.
 * Формат хранения — `соль:хеш`, как было до выноса в отдельный модуль:
 * существующие пароли должны продолжать проверяться.
 *
 * Вынесено из AuthService, потому что теперь пароль нужен и модулю управления
 * администраторами. Дублировать криптографию нельзя — расхождение в схеме
 * означало бы неработающий вход.
 */
const applySecretHmac = (password: string, secret: string): Buffer =>
    createHmac('sha256', secret).update(password).digest();

export const hashPassword = async (plainPassword: string, appSecret: string): Promise<string> => {
    const hmacResult = applySecretHmac(plainPassword, appSecret);
    const salt = randomBytes(16).toString('hex');

    const derivedKey = await scryptAsync(hmacResult.toString('hex'), salt, 64);

    return `${salt}:${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (
    plainPassword: string,
    storedHash: string,
    appSecret: string,
): Promise<boolean> => {
    const hmacResult = applySecretHmac(plainPassword, appSecret);
    const [salt, hash] = storedHash.split(':');

    if (!salt || !hash) {
        return false;
    }

    const derivedKey = await scryptAsync(hmacResult.toString('hex'), salt, 64);
    const calculated = Buffer.from(derivedKey.toString('hex'));
    const expected = Buffer.from(hash);

    // Длины должны совпадать: timingSafeEqual бросает исключение при разной
    // длине, а malformed-хеш не должен ронять запрос.
    if (calculated.length !== expected.length) {
        return false;
    }

    return timingSafeEqual(calculated, expected);
};
