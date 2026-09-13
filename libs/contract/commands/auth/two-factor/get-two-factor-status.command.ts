import { z } from 'zod';

import { AUTH_ROUTES, REST_API } from '../../../api';
import { getEndpointDetails } from '../../../constants';

export namespace GetTwoFactorStatusCommand {
    export const url = REST_API.AUTH.TWO_FACTOR.STATUS;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        AUTH_ROUTES.TWO_FACTOR.STATUS,
        'get',
        'Get two-factor authentication status of the current admin',
        { scope: 'two-factor-status', kind: 'read' },
    );

    export const ResponseSchema = z.object({
        response: z.object({
            isEnabled: z.boolean(),
        }),
    });

    export type Response = z.infer<typeof ResponseSchema>;
}
