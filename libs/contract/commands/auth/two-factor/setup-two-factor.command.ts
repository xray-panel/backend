import { z } from 'zod';

import { AUTH_ROUTES, REST_API } from '../../../api';
import { getEndpointDetails } from '../../../constants';

export namespace SetupTwoFactorCommand {
    export const url = REST_API.AUTH.TWO_FACTOR.SETUP;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        AUTH_ROUTES.TWO_FACTOR.SETUP,
        'post',
        'Generate a new TOTP secret for two-factor authentication setup',
        { scope: 'two-factor-setup', kind: 'write' },
    );

    export const ResponseSchema = z.object({
        response: z.object({
            secret: z.string(),
            otpauthUrl: z.string(),
        }),
    });

    export type Response = z.infer<typeof ResponseSchema>;
}
