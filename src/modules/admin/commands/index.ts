import { CreateAdminHandler } from './create-admin';
import { CreatePasskeyHandler } from './create-passkey';
import { DeleteAdminHandler } from './delete-admin';
import { DeletePasskeyHandler } from './delete-passkey';
import { UpdateAdminHandler } from './update-admin';
import { UpdateAdminTotpHandler } from './update-admin-totp';
import { UpdatePasskeyHandler } from './update-passkey';

export const COMMANDS = [
    CreateAdminHandler,
    UpdateAdminHandler,
    UpdateAdminTotpHandler,
    DeleteAdminHandler,
    CreatePasskeyHandler,
    UpdatePasskeyHandler,
    DeletePasskeyHandler,
];
