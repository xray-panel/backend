import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import { Injectable } from '@nestjs/common';

import { TLogSource } from '@libs/contracts/commands';

interface ILogSourceDefinition {
    /** Имя таблицы в PostgreSQL. */
    table: string;
    /** Колонка, по которой определяется возраст записи. */
    column: string;
}

/**
 * Справочник таблиц, доступных для просмотра и очистки.
 *
 * Имена таблиц и колонок берутся только отсюда. В SQL они подставляются через
 * Prisma.raw, что безопасно именно потому, что источник — эта константа, а не
 * значение из запроса: клиент передаёт лишь ключ, проверенный zod-перечислением.
 */
export const LOG_SOURCE_DEFINITIONS: Record<TLogSource, ILogSourceDefinition> = {
    usageHistory: { table: 'nodes_user_usage_history', column: 'created_at' },
    nodesUsageHistory: { table: 'nodes_usage_history', column: 'created_at' },
    hwidDevices: { table: 'hwid_user_devices', column: 'updated_at' },
    subscriptionRequestHistory: {
        table: 'user_subscription_request_history',
        column: 'request_at',
    },
    torrentBlockerReports: { table: 'torrent_blocker_reports', column: 'created_at' },
    adminAuditLog: { table: 'admin_audit_log', column: 'created_at' },
};

export interface ILogSourceStats {
    rows: number;
    oldest: Date | null;
}

@Injectable()
export class LogsRepository {
    constructor(private readonly prisma: TransactionHost<TransactionalAdapterPrisma>) {}

    public async getSourceStats(source: TLogSource): Promise<ILogSourceStats> {
        const { table, column } = LOG_SOURCE_DEFINITIONS[source];

        const result = await this.prisma.tx.$queryRaw<ILogSourceStats[]>(Prisma.sql`
            SELECT
                COUNT(*)::int AS "rows",
                MIN(${Prisma.raw(column)}) AS "oldest"
            FROM ${Prisma.raw(table)}
        `);

        return result[0] ?? { rows: 0, oldest: null };
    }

    /**
     * Полная очистка таблицы. Возвращает число удалённых записей.
     *
     * Именно полная, а не по возрасту: возрастная очистка выполняется
     * планировщиком по настройкам retention. Это ручное действие.
     */
    public async purgeSource(source: TLogSource): Promise<number> {
        const { table } = LOG_SOURCE_DEFINITIONS[source];

        return await this.prisma.tx.$executeRaw<number>(Prisma.sql`
            DELETE FROM ${Prisma.raw(table)}
        `);
    }
}
