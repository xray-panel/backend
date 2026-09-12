import { z } from 'zod';

import { REST_API, LOGS_ROUTES } from '../../api';
import { getEndpointDetails } from '../../constants';
import { LOG_SOURCES } from './get-logs-stats.command';

export namespace CleanLogsCommand {
    export const url = REST_API.LOGS.CLEAN;

    export const endpointDetails = getEndpointDetails(
        LOGS_ROUTES.CLEAN,
        'post',
        'Permanently delete all records from the selected log-like tables',
        { scope: 'clean', kind: 'write' },
    );

    export const RequestBodySchema = z.object({
        // Явное подтверждение обязательно: действие необратимо и удаляет всё
        // содержимое выбранных таблиц.
        confirm: z.literal(true),
        sources: z.array(z.enum(LOG_SOURCES)).min(1),
    });

    export const ResponseSchema = z.object({
        response: z.object({
            deleted: z.array(
                z.object({
                    source: z.enum(LOG_SOURCES),
                    deleted: z.number(),
                }),
            ),
        }),
    });

    export type RequestBody = z.infer<typeof RequestBodySchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
