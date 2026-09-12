/**
 * Политика ограничения попыток входа.
 *
 * Модуль намеренно не имеет импортов: это чистые функции, которые можно
 * проверить тестом без поднятия Redis и NestJS.
 */

export const LOGIN_LIMITS = {
    /** Неудачных попыток на пару «логин + IP». */
    pair: 5,
    /** Неудачных попыток с одного IP по любым логинам. */
    ip: 20,
    /** Неудачных попыток по логину с любых адресов. */
    account: 50,

    /** Окно подсчёта попыток, секунды. */
    windowSeconds: 15 * 60,

    /** Базовая длительность блокировки, секунды. */
    baseLockSeconds: 15 * 60,
    /** Предельная длительность блокировки, секунды. */
    maxLockSeconds: 60 * 60,
    /** Окно, в течение которого повторные блокировки удлиняются, секунды. */
    escalationWindowSeconds: 24 * 60 * 60,
    /** Сколько раз допускается удвоение длительности. */
    maxEscalationSteps: 4,
} as const;

/** Нужно ли блокировать вход по логину. */
export function shouldLockAccount(pairCount: number, accountCount: number): boolean {
    return pairCount >= LOGIN_LIMITS.pair || accountCount >= LOGIN_LIMITS.account;
}

/** Нужно ли блокировать вход с IP. */
export function shouldLockIp(ipCount: number): boolean {
    return ipCount >= LOGIN_LIMITS.ip;
}

/**
 * Длительность блокировки для уровня эскалации.
 * Уровень 1 — базовая, каждый следующий удваивает её до предела.
 */
export function lockDurationSeconds(level: number): number {
    const normalized = Math.max(1, Math.min(level, LOGIN_LIMITS.maxEscalationSteps + 1));
    return Math.min(
        LOGIN_LIMITS.baseLockSeconds * 2 ** (normalized - 1),
        LOGIN_LIMITS.maxLockSeconds,
    );
}

/** Остаток блокировки в секундах, 0 если она истекла. */
export function remainingLockSeconds(expiresAtMs: number, nowMs: number): number {
    const remainingMs = expiresAtMs - nowMs;
    if (remainingMs <= 0) {
        return 0;
    }
    return Math.ceil(remainingMs / 1000);
}
