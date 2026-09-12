import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NodesUserUsageHistoryRepository } from '../../repositories/nodes-user-usage-history.repository';
import { CleanOldUsageRecordsCommand } from './clean-old-usage-records.command';

@CommandHandler(CleanOldUsageRecordsCommand)
export class CleanOldUsageRecordsHandler implements ICommandHandler<CleanOldUsageRecordsCommand> {
    public readonly logger = new Logger(CleanOldUsageRecordsHandler.name);

    constructor(
        private readonly nodesUserUsageHistoryRepository: NodesUserUsageHistoryRepository,
    ) {}

    async execute(command: CleanOldUsageRecordsCommand): Promise<number> {
        try {
            const deleted = await this.nodesUserUsageHistoryRepository.cleanOldUsageRecords(
                command.retentionDays,
            );

            this.logger.log(
                `Deleted ${deleted} usage history records older than ${command.retentionDays} days.`,
            );

            return deleted;
        } catch (error: unknown) {
            this.logger.error(`Error during usage history cleanup: ${error}`);
            return 0;
        }
    }
}
