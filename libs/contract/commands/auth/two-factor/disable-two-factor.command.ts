import { z } from 'zod';

import { AUTH_ROUTES, REST_API } from '../../../api';
import { getEndpointDetails } from '../../../constants';

const TotpCodeSchema = z
    .string()
    .regex(/^\d{6}$/, 'Code must be exactly 6 digits')
    .describe('6-digit TOTP code from the authenticator app');

export namespace DisableTwoFactorCommand {
    export const url = REST_API.AUTH.TWO_FACTOR.DISABLE;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        AUTH_ROUTES.TWO_FACTOR.DISABLE,
        'post',
        'Disable two-factor authentication (requires a valid TOTP code)',
        { scope: 'two-factor-disable', kind: 'write' },
    );

    export const RequestBodySchema = z.object({
        code: TotpCodeSchema,
    });

    export const ResponseSchema = z.object({
        response: z.object({
            isEnabled: z.boolean(),
        }),
    });

    export type RequestBody = z.infer<typeof RequestBodySchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
