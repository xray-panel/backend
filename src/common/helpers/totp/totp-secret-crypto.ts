import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Шифрование секрета TOTP перед сохранением в базу.
 *
 * Секрет второго фактора — такая же учётная данные, как пароль: имея его,
 * можно генерировать верные коды. Поэтому в базе он лежит в зашифрованном
 * виде, а не открытым текстом.
 *
 * Ключ выводится из APP_SECRET через HKDF с отдельной меткой — так же, как
 * это уже сделано для ключа SSH-хранилища (rw-vault-oprf-v1). Отдельная метка
 * не даёт использовать один и тот же ключ в разных механизмах.
 *
 * Формат: v1:<iv>:<tag>:<ciphertext>, всё в base64. Версия в начале нужна,
 * чтобы потом можно было сменить схему и отличить старые записи.
 */

const VERSION = 'v1';
const HKDF_LABEL = 'xpanel-totp-v1';
const IV_LENGTH = 12;

const deriveKey = (appSecret: string): Buffer =>
    Buffer.from(hkdfSync('sha256', appSecret, Buffer.alloc(0), HKDF_LABEL, 32));

export const encryptTotpSecret = (plaintext: string, appSecret: string): string => {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', deriveKey(appSecret), iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
        VERSION,
        iv.toString('base64'),
        tag.toString('base64'),
        ciphertext.toString('base64'),
    ].join(':');
};

/**
 * Расшифровывает секрет. Бросает исключение, если запись повреждена, изменена
 * или ключ не тот: GCM проверяет целостность, и молча вернуть мусор нельзя.
 */
export const decryptTotpSecret = (payload: string, appSecret: string): string => {
    const parts = payload.split(':');

    if (parts.length !== 4 || parts[0] !== VERSION) {
        throw new Error('Unsupported TOTP secret format');
    }

    const [, ivB64, tagB64, ciphertextB64] = parts;
    const decipher = createDecipheriv(
        'aes-256-gcm',
        deriveKey(appSecret),
        Buffer.from(ivB64, 'base64'),
    );

    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextB64, 'base64')),
        decipher.final(),
    ]).toString('utf8');
};

export const isEncryptedTotpSecret = (payload: null | string): boolean =>
    typeof payload === 'string' && payload.startsWith(`${VERSION}:`);
