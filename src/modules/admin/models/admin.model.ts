import { AdminEntity } from '../entities/admin.entity';

/**
 * Представление администратора для API.
 *
 * В модель намеренно не попадают passwordHash и totpSecret: всё, что уходит
 * в ответ, описано здесь, поэтому случайно добавить секрет в ответ нельзя.
 */
export class AdminModel {
    public readonly uuid: string;
    public readonly username: string;
    public readonly role: string;
    public readonly totpEnabled: boolean;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(entity: AdminEntity) {
        this.uuid = entity.uuid;
        this.username = entity.username;
        this.role = entity.role;
        this.totpEnabled = entity.totpEnabled;
        this.createdAt = entity.createdAt;
        this.updatedAt = entity.updatedAt;
    }
}

export class GetAdminsResponseModel {
    public readonly admins: AdminModel[];

    constructor(admins: AdminModel[]) {
        this.admins = admins;
    }
}

/** Ответ на создание администратора: пароль и его хеш наружу не отдаются. */
export class CreateAdminResponseModel {
    public readonly uuid: string;
    public readonly username: string;
    public readonly role: string;
    public readonly createdAt: Date;

    constructor(entity: AdminEntity) {
        this.uuid = entity.uuid;
        this.username = entity.username;
        this.role = entity.role;
        this.createdAt = entity.createdAt;
    }
}

export class UpdateAdminResponseModel {
    public readonly uuid: string;
    public readonly username: string;
    public readonly updatedAt: Date;

    constructor(entity: AdminEntity) {
        this.uuid = entity.uuid;
        this.username = entity.username;
        this.updatedAt = entity.updatedAt;
    }
}
