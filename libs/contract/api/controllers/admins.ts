export const ADMINS_CONTROLLER = 'admins' as const;

export const ADMINS_ROUTES = {
    GET_ALL: '', // get
    CREATE: '', // post
    UPDATE: (uuid: string) => `${uuid}`, // patch
    DELETE: (uuid: string) => `${uuid}`, // delete
} as const;
