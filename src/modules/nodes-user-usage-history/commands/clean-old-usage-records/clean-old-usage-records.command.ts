import { Command } from '@nestjs/cqrs';

/**
 * Удаляет записи истории трафика старше заданного срока.
 *
 * Раньше вместо этого выполнялся TRUNCATE всей таблицы, то есть задача с
 * названием «clean old usage records» уничтожала историю целиком.
 */
export class CleanOldUsageRecordsCommand extends Command<number> {
    constructor(public readonly retentionDays: number) {
        super();
    }
}
