import { createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { RawCacheService } from '@common/raw-cache/raw-cache.service';

import {
    LOGIN_LIMITS,
    lockDurationSeconds,
    remainingLockSeconds,
    shouldLockAccount,
    shouldLockIp,
} from './login-attempts.policy';

/**
 * Защита входа от перебора пароля.
 *
 * Счётчики ведутся по трём независимым осям, потому что каждая закрывает свой
 * сценарий:
 *  - пара «логин + IP» — обычный перебор одного аккаунта с одного адреса;
 *  - IP по всем логинам — перебор списка логинов с одного адреса;
 *  - логин по всем IP — распределённый перебор, когда источник меняется.
 *
 * Блокировка по логину нужна именно для третьего случая, но она же позволяет
 * заблокировать администратора со стороны. Поэтому порог по логину заметно
 * выше, а длительность ограничена сверху.
 */

const digest = (value: string): string =>
    createHash('sha256').update(value).digest('hex').slice(0, 32);

const KEYS = {
    pair: (username: string, ip: string) =>
        `auth_fail:pair:${digest(`${username.toLowerCase()}|${ip}`)}`,
    ip: (ip: string) => `auth_fail:ip:${digest(ip)}`,
    account: (username: string) => `auth_fail:account:${digest(username.toLowerCase())}`,
    accountLock: (username: string) => `auth_lock:account:${digest(username.toLowerCase())}`,
    ipLock: (ip: string) => `auth_lock:ip:${digest(ip)}`,
    escalation: (username: string) => `auth_lock_level:${digest(username.toLowerCase())}`,
};

export interface ILoginBlockStatus {
    blocked: boolean;
    retryAfterSeconds: number;
    scope?: 'account' | 'ip';
}

@Injectable()
export class LoginAttemptsService {
    private readonly logger = new Logger(LoginAttemptsService.name);

    constructor(private readonly rawCacheService: RawCacheService) {}

    /**
     * Проверяет, не заблокирован ли вход. Факт существования аккаунта не
     * раскрывается: блокировка ставится на попытку входа, а не на запись
     * администратора, и срабатывает для любого логина одинаково.
     */
    public async getBlockStatus(username: string, ip: string): Promise<ILoginBlockStatus> {
        const now = Date.now();

        const accountLock = remainingLockSeconds(
            await this.rawCacheService.getNumber(KEYS.accountLock(username)),
            now,
        );
        if (accountLock > 0) {
            return { blocked: true, retryAfterSeconds: accountLock, scope: 'account' };
        }

        const ipLock = remainingLockSeconds(
            await this.rawCacheService.getNumber(KEYS.ipLock(ip)),
            now,
        );
        if (ipLock > 0) {
            return { blocked: true, retryAfterSeconds: ipLock, scope: 'ip' };
        }

        return { blocked: false, retryAfterSeconds: 0 };
    }

    /** Регистрирует неудачную попытку и при превышении порога ставит блокировку. */
    public async registerFailure(username: string, ip: string): Promise<void> {
        const window = LOGIN_LIMITS.windowSeconds;

        const [pairCount, ipCount, accountCount] = await Promise.all([
            this.rawCacheService.incrementWithTtl(KEYS.pair(username, ip), window),
            this.rawCacheService.incrementWithTtl(KEYS.ip(ip), window),
            this.rawCacheService.incrementWithTtl(KEYS.account(username), window),
        ]);

        if (shouldLockAccount(pairCount, accountCount)) {
            const seconds = await this.nextLockDuration(username);
            await this.writeLock(KEYS.accountLock(username), seconds);
            this.logger.warn(
                `Login blocked for account (pair=${pairCount}, account=${accountCount}) for ${seconds}s.`,
            );
        }

        if (shouldLockIp(ipCount)) {
            await this.writeLock(KEYS.ipLock(ip), LOGIN_LIMITS.windowSeconds);
            this.logger.warn(`Login blocked for IP (attempts=${ipCount}).`);
        }
    }

    /** Успешный вход снимает блокировку и счётчики по логину. */
    public async registerSuccess(username: string): Promise<void> {
        await this.rawCacheService.delMany([
            KEYS.account(username),
            KEYS.accountLock(username),
            KEYS.escalation(username),
        ]);
    }

    /** Каждая следующая блокировка в течение суток удваивает предыдущую. */
    private async nextLockDuration(username: string): Promise<number> {
        const level = await this.rawCacheService.incrementWithTtl(
            KEYS.escalation(username),
            LOGIN_LIMITS.escalationWindowSeconds,
        );

        return lockDurationSeconds(level);
    }

    private async writeLock(key: string, ttlSeconds: number): Promise<void> {
        await this.rawCacheService.setNumber(key, Date.now() + ttlSeconds * 1000, ttlSeconds);
    }
}
