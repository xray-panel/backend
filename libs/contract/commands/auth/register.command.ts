import { z } from 'zod';

import { AUTH_ROUTES, REST_API } from '../../api';
import { getEndpointDetails } from '../../constants';
import { ADMIN_PASSWORD_SCHEMA } from '../admins/admins.schema';

export namespace RegisterCommand {
    export const url = REST_API.AUTH.REGISTER;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        AUTH_ROUTES.REGISTER,
        'post',
        'Register as superadmin',
        { scope: 'register', kind: 'write' },
    );

    export const RequestBodySchema = z.object({
        username: z.string().describe('Username of the user'),
        password: ADMIN_PASSWORD_SCHEMA,
    });

    export const ResponseSchema = z.object({
        response: z.object({
            accessToken: z.string(),
        }),
    });

    export type RequestBody = z.infer<typeof RequestBodySchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
