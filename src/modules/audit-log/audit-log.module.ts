import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';

import { AuditLogController } from './audit-log.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './repositories/audit-log.repository';

@Module({
    // CqrsModule нужен guard'ам контроллера: JwtDefaultGuard зависит от QueryBus.
    imports: [CqrsModule],
    controllers: [AuditLogController],
    providers: [
        AuditLogService,
        AuditLogRepository,
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditLogInterceptor,
        },
    ],
})
export class AuditLogModule {}
