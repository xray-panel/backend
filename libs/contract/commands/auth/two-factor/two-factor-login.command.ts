import { z } from 'zod';

import { AUTH_ROUTES, REST_API } from '../../../api';
import { getEndpointDetails } from '../../../constants';

export namespace TwoFactorLoginCommand {
    export const url = REST_API.AUTH.TWO_FACTOR.LOGIN;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        AUTH_ROUTES.TWO_FACTOR.LOGIN,
        'post',
        'Complete login with a TOTP code using a two-factor ticket',
        { scope: 'two-factor-login', kind: 'write' },
    );

    export const RequestBodySchema = z.object({
        ticket: z.string().describe('Two-factor ticket returned by the login endpoint'),
        code: z
            .string()
            .regex(/^\d{6}$/, 'Code must be exactly 6 digits')
            .describe('6-digit TOTP code from the authenticator app'),
    });

    export const ResponseSchema = z.object({
        response: z.object({
            accessToken: z.string(),
        }),
    });

    export type RequestBody = z.infer<typeof RequestBodySchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
