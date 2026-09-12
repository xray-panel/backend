import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from './audit-log.service';

@Module({
    providers: [
        AuditLogService,
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditLogInterceptor,
        },
    ],
})
export class AuditLogModule {}
