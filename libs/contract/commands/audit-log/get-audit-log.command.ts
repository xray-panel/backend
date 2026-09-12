import { z } from 'zod';

import { AUDIT_LOG_ROUTES, REST_API } from '../../api';
import { getEndpointDetails } from '../../constants';

export namespace GetAuditLogCommand {
    export const url = REST_API.AUDIT_LOG.GET;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        AUDIT_LOG_ROUTES.GET,
        'get',
        'Get admin audit log entries',
        { scope: 'get', kind: 'read' },
    );

    export const RequestQuerySchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        size: z.coerce.number().int().min(1).max(100).default(25),
        adminUsername: z.string().optional(),
        action: z.string().optional(),
        status: z.enum(['success', 'failure']).optional(),
        /** Начало периода, ISO-строка. */
        from: z.string().optional(),
        /** Конец периода, ISO-строка. */
        to: z.string().optional(),
    });

    export const ResponseSchema = z.object({
        response: z.object({
            entries: z.array(
                z.object({
                    id: z.number(),
                    adminUsername: z.string(),
                    action: z.string(),
                    resource: z.string(),
                    status: z.string(),
                    statusCode: z.number(),
                    requestIp: z.string().nullable(),
                    userAgent: z.string().nullable(),
                    durationMs: z.number().nullable(),
                    createdAt: z.string(),
                }),
            ),
            total: z.number(),
        }),
    });

    export type RequestQuery = z.infer<typeof RequestQuerySchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
