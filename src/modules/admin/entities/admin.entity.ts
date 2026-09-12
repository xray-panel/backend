import { Admin } from '@prisma/client';

import { TRoleTypes } from '@libs/contracts/constants';

export class AdminEntity implements Admin {
    public uuid: string;
    public username: string;
    public passwordHash: string;
    public role: TRoleTypes;

    /** Секрет TOTP в зашифрованном виде. null — второй фактор не настроен. */
    public totpSecret: null | string;
    /** Проверяется ли код при входе. */
    public totpEnabled: boolean;

    public createdAt: Date;
    public updatedAt: Date;

    constructor(admin: Partial<Admin>) {
        Object.assign(this, admin);
        return this;
    }
}
