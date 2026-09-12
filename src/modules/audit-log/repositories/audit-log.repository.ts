import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import { Injectable } from '@nestjs/common';

export interface IAuditLogFilters {
    adminUsername?: string;
    action?: string;
    status?: string;
    from?: string;
    to?: string;
}

export interface IAuditLogRow {
    id: bigint;
    adminUsername: string;
    action: string;
    resource: string;
    status: string;
    statusCode: number;
    requestIp: null | string;
    userAgent: null | string;
    durationMs: null | number;
    createdAt: Date;
}

@Injectable()
export class AuditLogRepository {
    constructor(private readonly prisma: TransactionHost<TransactionalAdapterPrisma>) {}

    /** Условие отбора. Значения передаются параметрами — подстановки строк нет. */
    private buildWhere(filters: IAuditLogFilters): Prisma.Sql {
        const conditions: Prisma.Sql[] = [];

        if (filters.adminUsername) {
            conditions.push(Prisma.sql`admin_username = ${filters.adminUsername}`);
        }
        if (filters.action) {
            conditions.push(Prisma.sql`action = ${filters.action}`);
        }
        if (filters.status) {
            conditions.push(Prisma.sql`status = ${filters.status}`);
        }
        if (filters.from) {
            conditions.push(Prisma.sql`created_at >= ${new Date(filters.from)}`);
        }
        if (filters.to) {
            conditions.push(Prisma.sql`created_at <= ${new Date(filters.to)}`);
        }

        if (conditions.length === 0) {
            return Prisma.sql`TRUE`;
        }

        return Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
    }

    public async find(
        filters: IAuditLogFilters,
        page: number,
        size: number,
    ): Promise<{ entries: IAuditLogRow[]; total: number }> {
        const where = this.buildWhere(filters);

        const [entries, total] = await Promise.all([
            this.prisma.tx.$queryRaw<IAuditLogRow[]>(Prisma.sql`
                SELECT id, admin_username AS "adminUsername", action, resource, status,
                       status_code AS "statusCode", request_ip AS "requestIp",
                       user_agent AS "userAgent", duration_ms AS "durationMs",
                       created_at AS "createdAt"
                FROM admin_audit_log
                WHERE ${where}
                ORDER BY id DESC
                LIMIT ${size} OFFSET ${(page - 1) * size}
            `),
            this.prisma.tx.$queryRaw<{ count: number }[]>(Prisma.sql`
                SELECT COUNT(*)::int AS count FROM admin_audit_log WHERE ${where}
            `),
        ]);

        return { entries, total: total[0]?.count ?? 0 };
    }
}
