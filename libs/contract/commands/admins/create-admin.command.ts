import { z } from 'zod';

import { ADMINS_ROUTES, REST_API } from '../../api';
import { getEndpointDetails } from '../../constants';
import { ADMIN_PASSWORD_SCHEMA, ADMIN_USERNAME_SCHEMA } from './admins.schema';

export namespace CreateAdminCommand {
    export const url = REST_API.ADMINS.CREATE;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        ADMINS_ROUTES.CREATE,
        'post',
        'Create a new panel administrator',
        { scope: 'create', kind: 'write' },
    );

    export const RequestBodySchema = z.object({
        username: ADMIN_USERNAME_SCHEMA,
        password: ADMIN_PASSWORD_SCHEMA,
    });

    export const ResponseSchema = z.object({
        response: z.object({
            uuid: z.string(),
            username: z.string(),
            role: z.string(),
            createdAt: z.iso
                .datetime({ offset: true, local: true })
                .transform((str) => new Date(str)),
        }),
    });

    export type RequestBody = z.infer<typeof RequestBodySchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
