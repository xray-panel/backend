export const AUTH_CONTROLLER = 'auth' as const;

export const AUTH_ROUTES = {
    LOGIN: 'login',
    REGISTER: 'register',
    GET_STATUS: 'status',

    OAUTH2: {
        TELEGRAM_CALLBACK: 'oauth2/tg/callback',
        AUTHORIZE: 'oauth2/authorize',
        CALLBACK: 'oauth2/callback',
    },
    PASSKEY: {
        GET_AUTHENTICATION_OPTIONS: 'passkey/authentication/options', // get
        VERIFY_AUTHENTICATION: 'passkey/authentication/verify', // post
    },
    TWO_FACTOR: {
        STATUS: '2fa/status', // get
        SETUP: '2fa/setup', // post
        VERIFY: '2fa/verify', // post
        DISABLE: '2fa/disable', // post
        LOGIN: '2fa/login', // post
    },
} as const;
