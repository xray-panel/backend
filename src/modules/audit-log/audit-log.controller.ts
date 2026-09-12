import { Controller, Get, HttpStatus, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Endpoint } from '@common/decorators/base-endpoint';
import { Roles } from '@common/decorators/roles/roles';
import { ApiScopeResource } from '@common/decorators/scopes';
import { HttpExceptionFilter } from '@common/exception/http-exception.filter';
import { JwtDefaultGuard } from '@common/guards/jwt-guards/def-jwt-guard';
import { RolesGuard } from '@common/guards/roles';
import { ScopesGuard } from '@common/guards/scopes';
import { CONTROLLERS_INFO, AUDIT_LOG_CONTROLLER } from '@libs/contracts/api';
import { GetAuditLogCommand } from '@libs/contracts/commands';
import { ROLE } from '@libs/contracts/constants';

import { AuditLogService } from './audit-log.service';
import { GetAuditLogQueryDto, GetAuditLogResponseDto } from './dtos';

@ApiBearerAuth('Authorization')
@ApiScopeResource(CONTROLLERS_INFO.AUDIT_LOG.resource)
@ApiTags(CONTROLLERS_INFO.AUDIT_LOG.tag)
@Roles(ROLE.ADMIN, ROLE.API)
@UseGuards(JwtDefaultGuard, RolesGuard, ScopesGuard)
@UseFilters(HttpExceptionFilter)
@Controller(AUDIT_LOG_CONTROLLER)
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) {}

    @Endpoint({
        command: GetAuditLogCommand,
        httpCode: HttpStatus.OK,
        type: GetAuditLogResponseDto,
    })
    async getAuditLog(@Query() query: GetAuditLogQueryDto): Promise<GetAuditLogResponseDto> {
        return { response: await this.auditLogService.getAuditLog(query) };
    }
}
