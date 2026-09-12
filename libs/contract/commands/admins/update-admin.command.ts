import { z } from 'zod';

import { ADMINS_ROUTES, REST_API } from '../../api';
import { getEndpointDetails } from '../../constants';
import { ADMIN_PASSWORD_SCHEMA } from './admins.schema';

export namespace UpdateAdminCommand {
    export const url = REST_API.ADMINS.UPDATE;
    // Как в остальных командах с параметром пути: для клиента подставляется
    // литерал ':uuid', реальное значение приходит в route-параметрах.
    export const TSQ_url = url(':uuid');

    export const endpointDetails = getEndpointDetails(
        ADMINS_ROUTES.UPDATE(':uuid'),
        'patch',
        'Change administrator password',
        { scope: 'update', kind: 'write' },
    );

    export const RequestParamSchema = z.object({
        uuid: z.uuid(),
    });

    export const RequestBodySchema = z.object({
        password: ADMIN_PASSWORD_SCHEMA,
    });

    export const ResponseSchema = z.object({
        response: z.object({
            uuid: z.string(),
            username: z.string(),
            updatedAt: z.iso
                .datetime({ offset: true, local: true })
                .transform((str) => new Date(str)),
        }),
    });

    export type RequestParam = z.infer<typeof RequestParamSchema>;
    export type RequestBody = z.infer<typeof RequestBodySchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
