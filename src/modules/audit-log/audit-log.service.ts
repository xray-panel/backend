import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { Injectable, Logger } from '@nestjs/common';

import { GetAuditLogCommand } from '@libs/contracts/commands';

import { AuditLogRepository } from './repositories/audit-log.repository';

@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(
        private readonly auditLogRepository: AuditLogRepository,
        private readonly prisma: TransactionHost<TransactionalAdapterPrisma>,
    ) {}

    /**
     * Запись действия администратора.
     *
     * Тело запроса и query-строка не сохраняются намеренно: в них бывают
     * пароли, токены и секреты OAuth2. Ошибка журналирования проглатывается —
     * аудит не должен ломать основной запрос.
     */
    public async record(entry: {
        adminUuid: null | string;
        adminUsername: string;
        action: string;
        resource: string;
        status: 'failure' | 'success';
        statusCode: number;
        requestIp: null | string;
        userAgent: null | string;
        durationMs: null | number;
    }): Promise<void> {
        try {
            await this.prisma.tx.adminAuditLog.create({
                data: {
                    adminUuid: entry.adminUuid,
                    adminUsername: entry.adminUsername,
                    action: entry.action,
                    resource: entry.resource,
                    status: entry.status,
                    statusCode: entry.statusCode,
                    requestIp: entry.requestIp,
                    userAgent: entry.userAgent,
                    durationMs: entry.durationMs,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to write audit record: ${error}`);
        }
    }

    public async getAuditLog(
        query: GetAuditLogCommand.RequestQuery,
    ): Promise<GetAuditLogCommand.Response['response']> {
        const page = query.page ?? 1;
        const size = query.size ?? 25;

        const { entries, total } = await this.auditLogRepository.find(
            {
                adminUsername: query.adminUsername,
                action: query.action,
                status: query.status,
                from: query.from,
                to: query.to,
            },
            page,
            size,
        );

        return {
            entries: entries.map((entry) => ({
                id: Number(entry.id),
                adminUsername: entry.adminUsername,
                action: entry.action,
                resource: entry.resource,
                status: entry.status,
                statusCode: entry.statusCode,
                requestIp: entry.requestIp,
                userAgent: entry.userAgent,
                durationMs: entry.durationMs,
                createdAt: new Date(entry.createdAt).toISOString(),
            })),
            total,
        };
    }
}
