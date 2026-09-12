import { Command } from '@nestjs/cqrs';

import { ILogCleanupCounts } from '../../repositories/log-retention.repository';

/** Удаляет устаревшие записи в таблицах, содержащих персональные данные. */
export class CleanOldLogsCommand extends Command<ILogCleanupCounts> {
    constructor(
        public readonly nodesUsageHistoryDays: number,
        public readonly hwidUserDevicesDays: number,
        public readonly subscriptionRequestHistoryDays: number,
    ) {
        super();
    }
}
