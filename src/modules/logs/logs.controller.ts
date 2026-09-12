import { Body, Controller, HttpStatus, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Endpoint } from '@common/decorators/base-endpoint';
import { Roles } from '@common/decorators/roles/roles';
import { ApiScopeResource } from '@common/decorators/scopes';
import { HttpExceptionFilter } from '@common/exception/http-exception.filter';
import { JwtDefaultGuard } from '@common/guards/jwt-guards/def-jwt-guard';
import { RolesGuard } from '@common/guards/roles';
import { ScopesGuard } from '@common/guards/scopes';
import { errorHandler } from '@common/helpers/error-handler.helper';
import { CONTROLLERS_INFO, LOGS_CONTROLLER } from '@libs/contracts/api';
import { CleanLogsCommand, GetLogsStatsCommand } from '@libs/contracts/commands';
import { ROLE } from '@libs/contracts/constants';

import { CleanLogsBodyDto, CleanLogsResponseDto, GetLogsStatsResponseDto } from './dtos';
import { LogsService } from './logs.service';

@ApiBearerAuth('Authorization')
@ApiScopeResource(CONTROLLERS_INFO.LOGS.resource)
@ApiTags(CONTROLLERS_INFO.LOGS.tag)
@Roles(ROLE.ADMIN, ROLE.API)
@UseGuards(JwtDefaultGuard, RolesGuard, ScopesGuard)
@UseFilters(HttpExceptionFilter)
@Controller(LOGS_CONTROLLER)
export class LogsController {
    constructor(private readonly logsService: LogsService) {}

    @Endpoint({
        command: GetLogsStatsCommand,
        httpCode: HttpStatus.OK,
        type: GetLogsStatsResponseDto,
    })
    async getStats(): Promise<GetLogsStatsResponseDto> {
        const result = await this.logsService.getStats();

        const data = errorHandler(result);
        return {
            response: data,
        };
    }

    @Endpoint({
        command: CleanLogsCommand,
        httpCode: HttpStatus.OK,
        type: CleanLogsResponseDto,
    })
    async clean(@Body() body: CleanLogsBodyDto): Promise<CleanLogsResponseDto> {
        const result = await this.logsService.clean(body.sources);

        const data = errorHandler(result);
        return {
            response: data,
        };
    }
}
