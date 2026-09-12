import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { Injectable, Logger } from '@nestjs/common';

export interface IAdminAuditEntry {
    adminUuid: null | string;
    adminUsername: string;
    /** HTTP-метод действия. */
    action: string;
    /** Путь запроса без query-строки. */
    resource: string;
    status: 'failure' | 'success';
    statusCode: number;
    requestIp: null | string;
    userAgent: null | string;
    durationMs: null | number;
}

/**
 * Журнал действий администраторов.
 *
 * В записи намеренно НЕ попадают тело запроса и query-строка: в них бывают
 * пароли, токены и секреты OAuth2. Фиксируется только то, что нужно для
 * разбора инцидента: кто, что, когда, с какого адреса и с каким результатом.
 *
 * Запись не должна влиять на основной запрос: ошибка журналирования
 * проглатывается и только логируется.
 */
@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(private readonly prisma: TransactionHost<TransactionalAdapterPrisma>) {}

    public async record(entry: IAdminAuditEntry): Promise<void> {
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
}
