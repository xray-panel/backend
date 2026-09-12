import { z } from 'zod';

import { NODES_ROUTES, REST_API } from '../../../api';
import { getEndpointDetails } from '../../../constants';

export namespace ClearNodeLogsCommand {
    export const url = REST_API.NODES.ACTIONS.CLEAR_LOGS;
    export const TSQ_url = url(':uuid');

    export const endpointDetails = getEndpointDetails(
        NODES_ROUTES.ACTIONS.CLEAR_LOGS(':uuid'),
        'post',
        'Clear Xray logs on node',
        { scope: 'clear-logs', kind: 'write' },
    );

    export const RequestParamSchema = z.object({
        uuid: z.uuid(),
    });

    export const ResponseSchema = z.object({
        response: z.object({
            directory: z.string(),
            rotated: z.boolean(),
            removedArchives: z.number(),
            bytesFreed: z.number(),
            truncatedCurrent: z.boolean(),
        }),
    });

    export type RequestParam = z.infer<typeof RequestParamSchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
