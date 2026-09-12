import { Transactional } from '@nestjs-cls/transactional';

import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { TypedConfigService } from '@common/config/app-config';
import { hashPassword } from '@common/helpers/password/password.helper';
import { fail, ok, TResult } from '@common/types';
import { ROLE } from '@libs/contracts/constants';
import { ERRORS } from '@libs/contracts/constants/errors';

import { CreateAdminCommand } from '../commands/create-admin';
import { DeleteAdminCommand } from '../commands/delete-admin';
import { UpdateAdminCommand } from '../commands/update-admin';
import { AdminEntity } from '../entities/admin.entity';
import { CreateAdminBodyDto, UpdateAdminBodyDto } from '../dtos';
import {
    AdminModel,
    CreateAdminResponseModel,
    GetAdminsResponseModel,
    UpdateAdminResponseModel,
} from '../models/admin.model';
import { CountAdminsByRoleQuery } from '../queries/count-admins-by-role';
import { GetAdminByUsernameQuery } from '../queries/get-admin-by-username';
import { GetAdminByUuidQuery } from '../queries/get-admin-by-uuid';
import { GetAdminsQuery } from '../queries/get-admins';
import { AdminRepository } from '../repositories/admin.repository';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);
    private readonly appSecret: string;

    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly adminRepository: AdminRepository,
        private readonly configService: TypedConfigService,
    ) {
        this.appSecret = this.configService.getOrThrow('APP_SECRET');
    }

    public async getAdmins(): Promise<TResult<GetAdminsResponseModel>> {
        const result = await this.queryBus.execute<GetAdminsQuery, TResult<AdminEntity[]>>(
            new GetAdminsQuery(ROLE.ADMIN),
        );

        if (!result.isOk) {
            return fail(ERRORS.GET_ADMINS_ERROR);
        }

        return ok(new GetAdminsResponseModel(result.response.map((admin) => new AdminModel(admin))));
    }

    public async createAdmin(
        body: CreateAdminBodyDto,
    ): Promise<TResult<CreateAdminResponseModel>> {
        // Проверяем занятость имени заранее: иначе Prisma вернёт P2002 и
        // пользователь увидит невнятную 500 вместо понятного 409.
        const existing = await this.getAdminByUsername(body.username);

        if (existing) {
            return fail(ERRORS.ADMIN_USERNAME_ALREADY_EXISTS);
        }

        const passwordHash = await hashPassword(body.password, this.appSecret);

        const result = await this.commandBus.execute<CreateAdminCommand, TResult<AdminEntity>>(
            new CreateAdminCommand(body.username, passwordHash, ROLE.ADMIN),
        );

        if (!result.isOk) {
            return fail(ERRORS.CREATE_ADMIN_ERROR);
        }

        return ok(new CreateAdminResponseModel(result.response));
    }

    public async updateAdmin(
        uuid: string,
        body: UpdateAdminBodyDto,
    ): Promise<TResult<UpdateAdminResponseModel>> {
        const admin = await this.getAdminByUuid(uuid);

        if (!admin) {
            return fail(ERRORS.ADMIN_NOT_FOUND);
        }

        const passwordHash = await hashPassword(body.password, this.appSecret);

        const result = await this.commandBus.execute<UpdateAdminCommand, TResult<AdminEntity>>(
            new UpdateAdminCommand(admin.uuid, passwordHash),
        );

        if (!result.isOk) {
            return fail(ERRORS.UPDATE_ADMIN_ERROR);
        }

        return ok(new UpdateAdminResponseModel(result.response));
    }

    public async deleteAdmin(
        uuid: string,
        requesterUuid: null | string,
    ): Promise<TResult<boolean>> {
        const admin = await this.getAdminByUuid(uuid);

        if (!admin) {
            return fail(ERRORS.ADMIN_NOT_FOUND);
        }

        // Удаление самого себя отрезало бы доступ к панели до тех пор, пока
        // другой администратор не восстановит учётную запись.
        if (requesterUuid !== null && admin.uuid === requesterUuid) {
            return fail(ERRORS.CANNOT_DELETE_SELF);
        }

        const adminCount = await this.queryBus.execute<
            CountAdminsByRoleQuery,
            TResult<number>
        >(new CountAdminsByRoleQuery(ROLE.ADMIN));

        if (!adminCount.isOk) {
            return fail(ERRORS.GET_ADMINS_ERROR);
        }

        // Панель без администраторов не пустит внутрь никого: регистрация
        // доступна только пока в базе нет ни одной учётной записи.
        if (adminCount.response <= 1) {
            return fail(ERRORS.CANNOT_DELETE_LAST_ADMIN);
        }

        return this.deleteAdminAtomic(admin.uuid);
    }

    /**
     * Удаление под блокировкой таблицы.
     *
     * Проверка количества и удаление обязаны быть одной операцией: между ними
     * два одновременных удаления успели бы обнулить таблицу администраторов.
     */
    @Transactional()
    private async deleteAdminAtomic(adminUuid: string): Promise<TResult<boolean>> {
        await this.adminRepository.lockAdmins();

        const adminCount = await this.adminRepository.countByCriteria({ role: ROLE.ADMIN });

        if (adminCount <= 1) {
            return fail(ERRORS.CANNOT_DELETE_LAST_ADMIN);
        }

        const result = await this.commandBus.execute<DeleteAdminCommand, TResult<boolean>>(
            new DeleteAdminCommand(adminUuid),
        );

        if (!result.isOk) {
            return fail(ERRORS.DELETE_ADMIN_ERROR);
        }

        return ok(result.response);
    }

    private async getAdminByUsername(username: string): Promise<AdminEntity | null> {
        const result = await this.queryBus.execute<
            GetAdminByUsernameQuery,
            TResult<AdminEntity>
        >(new GetAdminByUsernameQuery(username, ROLE.ADMIN));

        return result.isOk ? result.response : null;
    }

    private async getAdminByUuid(uuid: string): Promise<AdminEntity | null> {
        const result = await this.queryBus.execute<
            GetAdminByUuidQuery,
            TResult<AdminEntity>
        >(new GetAdminByUuidQuery(uuid));

        if (!result.isOk) {
            return null;
        }

        // Через этот API управляем только администраторами панели.
        // Учётные записи с ролью API не должны попадать под изменение пароля
        // или удаление: ими управляет отдельный механизм токенов.
        if (result.response.role !== ROLE.ADMIN) {
            return null;
        }

        return result.response;
    }
}
