import { Body, Controller, Delete, HttpStatus, Param, Patch, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Endpoint } from '@common/decorators/base-endpoint';
import { GetJWTPayload } from '@common/decorators/get-jwt-payload';
import { Roles } from '@common/decorators/roles';
import { HttpExceptionFilter } from '@common/exception/http-exception.filter';
import { JwtDefaultGuard } from '@common/guards/jwt-guards/def-jwt-guard';
import { RolesGuard } from '@common/guards/roles/roles.guard';
import { errorHandler } from '@common/helpers/error-handler.helper';
import { ADMINS_CONTROLLER, CONTROLLERS_INFO } from '@libs/contracts/api';
import {
    CreateAdminCommand,
    DeleteAdminCommand,
    GetAdminsCommand,
    UpdateAdminCommand,
} from '@libs/contracts/commands';
import { ROLE } from '@libs/contracts/constants';

import type { IJWTAuthPayload } from '@modules/auth/interfaces';

import {
    CreateAdminBodyDto,
    CreateAdminResponseDto,
    DeleteAdminResponseDto,
    GetAdminsResponseDto,
    UpdateAdminBodyDto,
    UpdateAdminResponseDto,
} from '../dtos';
import { AdminService } from '../services/admin.service';

/**
 * Управление администраторами панели.
 *
 * Доступен только роли ADMIN: API-токены сюда не допускаются, иначе утечка
 * токена позволяла бы создать себе полноценного администратора панели.
 */
@ApiBearerAuth('Authorization')
@ApiTags(CONTROLLERS_INFO.ADMINS.tag)
@Roles(ROLE.ADMIN)
@UseGuards(JwtDefaultGuard, RolesGuard)
@UseFilters(HttpExceptionFilter)
@Controller(ADMINS_CONTROLLER)
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Endpoint({
        command: GetAdminsCommand,
        httpCode: HttpStatus.OK,
        type: GetAdminsResponseDto,
    })
    async getAdmins(): Promise<GetAdminsResponseDto> {
        const result = await this.adminService.getAdmins();

        const data = errorHandler(result);
        return {
            response: data,
        };
    }

    @Endpoint({
        command: CreateAdminCommand,
        httpCode: HttpStatus.CREATED,
        type: CreateAdminResponseDto,
    })
    async createAdmin(@Body() body: CreateAdminBodyDto): Promise<CreateAdminResponseDto> {
        const result = await this.adminService.createAdmin(body);

        const data = errorHandler(result);
        return {
            response: data,
        };
    }

    @Endpoint({
        command: UpdateAdminCommand,
        httpCode: HttpStatus.OK,
        type: UpdateAdminResponseDto,
    })
    async updateAdmin(
        @Param('uuid') uuid: string,
        @Body() body: UpdateAdminBodyDto,
    ): Promise<UpdateAdminResponseDto> {
        const result = await this.adminService.updateAdmin(uuid, body);

        const data = errorHandler(result);
        return {
            response: data,
        };
    }

    @Endpoint({
        command: DeleteAdminCommand,
        httpCode: HttpStatus.OK,
        type: DeleteAdminResponseDto,
    })
    async deleteAdmin(
        @Param('uuid') uuid: string,
        @GetJWTPayload() payload: IJWTAuthPayload,
    ): Promise<DeleteAdminResponseDto> {
        const result = await this.adminService.deleteAdmin(uuid, payload.uuid);

        const data = errorHandler(result);
        return {
            response: { isDeleted: data },
        };
    }
}
