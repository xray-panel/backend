import { Body, Controller, HttpStatus, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Endpoint } from '@common/decorators/base-endpoint';
import { GetJWTPayload } from '@common/decorators/get-jwt-payload';
import { Roles } from '@common/decorators/roles/roles';
import { HttpExceptionFilter } from '@common/exception/http-exception.filter';
import { errorHandler } from '@common/helpers/error-handler.helper';
import { JwtDefaultGuard } from '@common/guards/jwt-guards/def-jwt-guard';
import { RolesGuard } from '@common/guards/roles';
import { CONTROLLERS_INFO } from '@libs/contracts/api';
import { AUTH_CONTROLLER } from '@libs/contracts/api/controllers/auth';
import {
    DisableTwoFactorCommand,
    GetTwoFactorStatusCommand,
    SetupTwoFactorCommand,
    VerifyTwoFactorCommand,
} from '@libs/contracts/commands';
import { ROLE } from '@libs/contracts/constants';

import { AuthService } from './auth.service';
import {
    DisableTwoFactorBodyDto,
    DisableTwoFactorResponseDto,
    SetupTwoFactorResponseDto,
    TwoFactorStatusResponseDto,
    VerifyTwoFactorBodyDto,
    VerifyTwoFactorResponseDto,
} from './dtos';
// Именно type-импорт: интерфейс используется только как тип, а при
// emitDecoratorMetadata компилятор иначе оставляет ссылку на него в
// сгенерированном коде и сборка падает на «module has no exports».
import type { IJWTAuthPayload } from './interfaces';

/**
 * Управление вторым фактором текущего администратора. Отдельный контроллер,
 * потому что эти эндпоинты требуют браузерный JWT, а AuthController публичный.
 * Базовый путь тот же (auth), маршруты не пересекаются.
 */
@ApiBearerAuth('Authorization')
@ApiTags(CONTROLLERS_INFO.AUTH.tag)
@Roles(ROLE.ADMIN)
@UseGuards(JwtDefaultGuard, RolesGuard)
@UseFilters(HttpExceptionFilter)
@Controller(AUTH_CONTROLLER)
export class TwoFactorController {
    constructor(private readonly authService: AuthService) {}

    @Endpoint({
        command: GetTwoFactorStatusCommand,
        httpCode: HttpStatus.OK,
        type: TwoFactorStatusResponseDto,
    })
    async getStatus(
        @GetJWTPayload() payload: IJWTAuthPayload,
    ): Promise<TwoFactorStatusResponseDto> {
        const result = await this.authService.getTwoFactorStatus(payload.username ?? '');

        const data = errorHandler(result);
        return {
            response: data,
        };
    }

    @Endpoint({
        command: SetupTwoFactorCommand,
        httpCode: HttpStatus.OK,
        type: SetupTwoFactorResponseDto,
    })
    async setup(
        @GetJWTPayload() payload: IJWTAuthPayload,
    ): Promise<SetupTwoFactorResponseDto> {
        const result = await this.authService.setupTwoFactor(payload.username ?? '');

        const data = errorHandler(result);
        return {
            response: data,
        };
    }

    @Endpoint({
        command: VerifyTwoFactorCommand,
        httpCode: HttpStatus.OK,
        type: VerifyTwoFactorResponseDto,
    })
    async verify(
        @Body() body: VerifyTwoFactorBodyDto,
        @GetJWTPayload() payload: IJWTAuthPayload,
    ): Promise<VerifyTwoFactorResponseDto> {
        const result = await this.authService.verifyTwoFactor(payload.username ?? '', body.code);

        const data = errorHandler(result);
        return {
            response: data,
        };
    }

    @Endpoint({
        command: DisableTwoFactorCommand,
        httpCode: HttpStatus.OK,
        type: DisableTwoFactorResponseDto,
    })
    async disable(
        @Body() body: DisableTwoFactorBodyDto,
        @GetJWTPayload() payload: IJWTAuthPayload,
    ): Promise<DisableTwoFactorResponseDto> {
        const result = await this.authService.disableTwoFactor(payload.username ?? '', body.code);

        const data = errorHandler(result);
        return {
            response: data,
        };
    }
}
