import { Job } from 'bullmq';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TypedConfigService } from '@common/config/app-config';
import { CleanOldUsageRecordsCommand } from '@modules/nodes-user-usage-history/commands/clean-old-usage-records';
import { VacuumNodesUserUsageHistoryCommand } from '@modules/nodes-user-usage-history/commands/vacuum-nodes-user-usage-history';

import { UsersQueuesService } from '@queue/_users';

import { QUEUES_NAMES } from '../queue.enum';
import { ServiceJobNames } from './enums';

@Processor(QUEUES_NAMES.SERVICE, {
    concurrency: 1,
})
export class ServiceQueueProcessor extends WorkerHost {
    private readonly logger = new Logger(ServiceQueueProcessor.name);

    constructor(
        private readonly commandBus: CommandBus,
        private readonly usersQueuesService: UsersQueuesService,
        private readonly configService: TypedConfigService,
    ) {
        super();
    }

    async process(job: Job) {
        switch (job.name) {
            case ServiceJobNames.CLEAN_OLD_USAGE_RECORDS:
                return await this.handleCleanOldUsageRecordsJob();
            case ServiceJobNames.VACUUM_TABLES:
                return await this.handleVacuumTablesJob();
            default:
                this.logger.warn(`Job "${job.name}" is not handled.`);
                break;
        }
    }

    private async handleCleanOldUsageRecordsJob() {
        try {
            await this.usersQueuesService.queues.updateUsersUsage.pause();

            const retentionDays = this.configService.getOrThrow('USAGE_HISTORY_RETENTION_DAYS');

            this.logger.log(
                `Deleting usage history older than ${retentionDays} days...`,
            );

            // Раньше здесь выполнялся TRUNCATE всей таблицы, из-за чего задача
            // с названием «clean old usage records» уничтожала историю целиком
            // вместо удаления старых записей.
            const deleted = (await this.commandBus.execute(
                new CleanOldUsageRecordsCommand(retentionDays),
            )) as number;

            await this.commandBus.execute(new VacuumNodesUserUsageHistoryCommand());

            this.logger.log(`Usage history cleanup finished, deleted ${deleted} records.`);
        } catch (error) {
            this.logger.error(
                `Error handling "${ServiceJobNames.CLEAN_OLD_USAGE_RECORDS}" job: ${error}`,
            );
        } finally {
            await this.usersQueuesService.queues.updateUsersUsage.resume();
        }
    }

    private async handleVacuumTablesJob() {
        try {
            await this.commandBus.execute(new VacuumNodesUserUsageHistoryCommand());

            this.logger.log('Tables vacuumed successfully.');
        } catch (error) {
            this.logger.error(`Error handling "${ServiceJobNames.VACUUM_TABLES}" job: ${error}`);
        }
    }
}
