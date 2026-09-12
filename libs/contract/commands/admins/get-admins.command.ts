import { z } from 'zod';

import { ADMINS_ROUTES, REST_API } from '../../api';
import { getEndpointDetails } from '../../constants';

export namespace GetAdminsCommand {
    export const url = REST_API.ADMINS.GET_ALL;
    export const TSQ_url = url;

    export const endpointDetails = getEndpointDetails(
        ADMINS_ROUTES.GET_ALL,
        'get',
        'List panel administrators',
        { scope: 'get', kind: 'read' },
    );

    // Наружу отдаётся только признак включённого второго фактора.
    // Сам секрет TOTP и хеш пароля не покидают сервер ни при каких условиях.
    export const ResponseSchema = z.object({
        response: z.object({
            admins: z.array(
                z.object({
                    uuid: z.string(),
                    username: z.string(),
                    role: z.string(),
                    /** Настроен ли у администратора второй фактор. */
                    totpEnabled: z.boolean(),
                    createdAt: z.iso
                        .datetime({ offset: true, local: true })
                        .transform((str) => new Date(str)),
                    updatedAt: z.iso
                        .datetime({ offset: true, local: true })
                        .transform((str) => new Date(str)),
                }),
            ),
        }),
    });

    export type Response = z.infer<typeof ResponseSchema>;
}
