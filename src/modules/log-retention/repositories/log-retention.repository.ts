import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import { Injectable } from '@nestjs/common';

export interface ILogCleanupCounts {
    nodesUsageHistory: number;
    hwidUserDevices: number;
    subscriptionRequestHistory: number;
}

/**
 * Удаление устаревших записей по сроку хранения.
 *
 * Срок передаётся параметром (make_interval), а не подставляется в текст
 * запроса: значения приходят из настроек окружения, и подстановка строки
 * открыла бы инъекцию.
 *
 * Запросы намеренно не объединены в транзакцию: сбой на одной таблице не
 * должен мешать очистке остальных, а частичное удаление здесь безопасно.
 */
@Injectable()
export class LogRetentionRepository {
    constructor(private readonly prisma: TransactionHost<TransactionalAdapterPrisma>) {}

    /**
     * Почасовая статистика трафика по нодам.
     * Персональных данных не содержит, но растёт неограниченно: раньше эта
     * таблица не чистилась вообще.
     */
    public async deleteOldNodesUsageHistory(days: number): Promise<number> {
        return await this.prisma.tx.$executeRaw<number>(Prisma.sql`
            DELETE FROM nodes_usage_history
            WHERE created_at < NOW() - make_interval(days => ${days}::int)
        `);
    }

    /**
     * Устройства пользователей. Самая чувствительная таблица: hwid, модель
     * устройства, версия ОС, user-agent и IP-адрес запроса.
     * Отсчёт идёт от updated_at, поэтому активно используемые устройства
     * сохраняются, а не возвращавшиеся дольше срока — удаляются.
     */
    public async deleteOldHwidUserDevices(days: number): Promise<number> {
        return await this.prisma.tx.$executeRaw<number>(Prisma.sql`
            DELETE FROM hwid_user_devices
            WHERE updated_at < NOW() - make_interval(days => ${days}::int)
        `);
    }

    /**
     * История запросов подписки: IP-адрес и user-agent на каждую выдачу.
     * Дополнительно к обрезке до 24 последних записей на пользователя.
     */
    public async deleteOldSubscriptionRequestHistory(days: number): Promise<number> {
        return await this.prisma.tx.$executeRaw<number>(Prisma.sql`
            DELETE FROM user_subscription_request_history
            WHERE request_at < NOW() - make_interval(days => ${days}::int)
        `);
    }
}
