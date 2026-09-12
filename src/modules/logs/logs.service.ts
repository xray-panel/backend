import { Injectable, Logger } from '@nestjs/common';

import { TypedConfigService } from '@common/config/app-config';
import { fail, ok, TResult } from '@common/types';
import { LOG_SOURCES, TLogSource } from '@libs/contracts/commands';
import { ERRORS } from '@libs/contracts/constants/errors';

import { LogsRepository } from './repositories/logs.repository';

export interface ILogsStats {
    retention: {
        usageHistory: { enabled: boolean; days: number };
        oldLogs: { enabled: boolean };
        nodesUsageHistoryDays: number;
        hwidDevicesDays: number;
        subscriptionRequestHistoryDays: number;
        auditLogDays: number;
    };
    sources: {
        source: TLogSource;
        rows: number;
        oldest: string | null;
    }[];
}

export interface ICleanLogsResult {
    deleted: {
        source: TLogSource;
        deleted: number;
    }[];
}

@Injectable()
export class LogsService {
    private readonly logger = new Logger(LogsService.name);

    constructor(
        private readonly logsRepository: LogsRepository,
        private readonly configService: TypedConfigService,
    ) {}

    public async getStats(): Promise<TResult<ILogsStats>> {
        try {
            const sources = await Promise.all(
                LOG_SOURCES.map(async (source) => {
                    const stats = await this.logsRepository.getSourceStats(source);

                    return {
                        source,
                        rows: stats.rows,
                        oldest: stats.oldest ? new Date(stats.oldest).toISOString() : null,
                    };
                }),
            );

            return ok({
                retention: {
                    usageHistory: {
                        enabled: this.configService.getOrThrow('SERVICE_CLEAN_USAGE_HISTORY'),
                        days: this.configService.getOrThrow('USAGE_HISTORY_RETENTION_DAYS'),
                    },
                    oldLogs: {
                        enabled: this.configService.getOrThrow('SERVICE_CLEAN_OLD_LOGS'),
                    },
                    nodesUsageHistoryDays: this.configService.getOrThrow(
                        'NODES_USAGE_HISTORY_RETENTION_DAYS',
                    ),
                    hwidDevicesDays: this.configService.getOrThrow('HWID_DEVICES_RETENTION_DAYS'),
                    subscriptionRequestHistoryDays: this.configService.getOrThrow(
                        'SUBSCRIPTION_REQUEST_HISTORY_RETENTION_DAYS',
                    ),
                    auditLogDays: this.configService.getOrThrow('AUDIT_LOG_RETENTION_DAYS'),
                },
                sources,
            });
        } catch (error) {
            this.logger.error(`Failed to collect logs stats: ${error}`);
            return fail(ERRORS.INTERNAL_SERVER_ERROR);
        }
    }

    public async clean(sources: TLogSource[]): Promise<TResult<ICleanLogsResult>> {
        try {
            const deleted: ICleanLogsResult['deleted'] = [];

            // Каждая таблица очищается независимо: сбой на одной не должен
            // мешать остальным, а частичный результат честнее общего отказа.
            for (const source of sources) {
                try {
                    const count = await this.logsRepository.purgeSource(source);
                    deleted.push({ source, deleted: count });
                } catch (error) {
                    this.logger.error(`Failed to purge ${source}: ${error}`);
                    deleted.push({ source, deleted: 0 });
                }
            }

            this.logger.warn(
                `Manual logs purge executed: ${deleted
                    .map((d) => `${d.source}=${d.deleted}`)
                    .join(', ')}`,
            );

            return ok({ deleted });
        } catch (error) {
            this.logger.error(`Failed to purge logs: ${error}`);
            return fail(ERRORS.INTERNAL_SERVER_ERROR);
        }
    }
}
