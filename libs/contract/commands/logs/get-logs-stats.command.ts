import { z } from 'zod';

import { REST_API, LOGS_ROUTES } from '../../api';
import { getEndpointDetails } from '../../constants';

export const LOG_SOURCES = [
    'usageHistory',
    'nodesUsageHistory',
    'hwidDevices',
    'subscriptionRequestHistory',
    'torrentBlockerReports',
    'adminAuditLog',
] as const;

export type TLogSource = (typeof LOG_SOURCES)[number];

export namespace GetLogsStatsCommand {
    export const url = REST_API.LOGS.GET_STATS;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        LOGS_ROUTES.GET_STATS,
        'get',
        'Get size and retention settings of log-like tables',
        { scope: 'get-stats', kind: 'read' },
    );

    export const ResponseSchema = z.object({
        response: z.object({
            retention: z.object({
                usageHistory: z.object({ enabled: z.boolean(), days: z.number() }),
                oldLogs: z.object({ enabled: z.boolean() }),
                nodesUsageHistoryDays: z.number(),
                hwidDevicesDays: z.number(),
                subscriptionRequestHistoryDays: z.number(),
                auditLogDays: z.number(),
            }),
            sources: z.array(
                z.object({
                    source: z.enum(LOG_SOURCES),
                    rows: z.number(),
                    oldest: z.string().nullable(),
                }),
            ),
        }),
    });

    export type Response = z.infer<typeof ResponseSchema>;
}
