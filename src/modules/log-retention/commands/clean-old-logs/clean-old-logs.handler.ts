import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
    ILogCleanupCounts,
    LogRetentionRepository,
} from '../../repositories/log-retention.repository';
import { CleanOldLogsCommand } from './clean-old-logs.command';

@CommandHandler(CleanOldLogsCommand)
export class CleanOldLogsHandler implements ICommandHandler<CleanOldLogsCommand> {
    public readonly logger = new Logger(CleanOldLogsHandler.name);

    constructor(private readonly logRetentionRepository: LogRetentionRepository) {}

    async execute(command: CleanOldLogsCommand): Promise<ILogCleanupCounts> {
        const counts: ILogCleanupCounts = {
            nodesUsageHistory: 0,
            hwidUserDevices: 0,
            subscriptionRequestHistory: 0,
            adminAuditLog: 0,
        };

        // Каждая таблица очищается независимо: сбой на одной не должен
        // блокировать остальные.
        counts.nodesUsageHistory = await this.run('nodes_usage_history', () =>
            this.logRetentionRepository.deleteOldNodesUsageHistory(
                command.nodesUsageHistoryDays,
            ),
        );

        counts.hwidUserDevices = await this.run('hwid_user_devices', () =>
            this.logRetentionRepository.deleteOldHwidUserDevices(command.hwidUserDevicesDays),
        );

        counts.subscriptionRequestHistory = await this.run(
            'user_subscription_request_history',
            () =>
                this.logRetentionRepository.deleteOldSubscriptionRequestHistory(
                    command.subscriptionRequestHistoryDays,
                ),
        );

        counts.adminAuditLog = await this.run('admin_audit_log', () =>
            this.logRetentionRepository.deleteOldAdminAuditLog(command.auditLogDays),
        );

        this.logger.log(
            `Log retention finished: nodes_usage_history=${counts.nodesUsageHistory}, ` +
                `hwid_user_devices=${counts.hwidUserDevices}, ` +
                `user_subscription_request_history=${counts.subscriptionRequestHistory}, ` +
                `admin_audit_log=${counts.adminAuditLog}`,
        );

        return counts;
    }

    private async run(table: string, action: () => Promise<number>): Promise<number> {
        try {
            return await action();
        } catch (error) {
            this.logger.error(`Failed to clean ${table}: ${error}`);
            return 0;
        }
    }
}
