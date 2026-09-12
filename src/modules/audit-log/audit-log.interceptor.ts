import { Observable, tap } from 'rxjs';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

import { BACKEND_TOOLS_ROOT, HEALTH_ROOT, METRICS_ROOT, ROOT } from '@libs/contracts/api';

import { AuditLogService } from './audit-log.service';

/** Методы, изменяющие состояние. Чтение в журнал не пишется. */
const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Служебные пути, которые не являются действиями администратора. */
const SKIPPED_PREFIXES = [
    `${ROOT}${METRICS_ROOT}`,
    `${ROOT}${HEALTH_ROOT}`,
    `${ROOT}${BACKEND_TOOLS_ROOT}`,
];

interface IAuditRequest {
    method?: string;
    originalUrl?: string;
    url?: string;
    clientIp?: string;
    headers?: Record<string, string | string[] | undefined>;
    user?: { username?: string; uuid?: string };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(private readonly auditLogService: AuditLogService) {}

    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (ctx.getType() !== 'http') {
            return next.handle();
        }

        const req = ctx.switchToHttp().getRequest<IAuditRequest>();
        const method = (req.method ?? '').toUpperCase();

        if (!AUDITED_METHODS.has(method)) {
            return next.handle();
        }

        // Query-строка отбрасывается: в ней встречаются токены и идентификаторы
        // подписки, которым не место в журнале.
        const path = (req.originalUrl ?? req.url ?? '').split('?')[0];

        if (SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
            return next.handle();
        }

        const startedAt = Date.now();
        const admin = req.user;

        const write = (status: 'failure' | 'success', statusCode: number): void => {
            // Админ определяется по JWT. Если его нет (публичный маршрут с
            // изменяющим методом), запись всё равно нужна — фиксируем как
            // анонимную попытку.
            void this.auditLogService.record({
                adminUuid: admin?.uuid ?? null,
                adminUsername: admin?.username ?? 'anonymous',
                action: method,
                resource: path,
                status,
                statusCode,
                requestIp: req.clientIp ?? null,
                userAgent: (req.headers?.['user-agent'] as string | undefined) ?? null,
                durationMs: Date.now() - startedAt,
            });
        };

        return next.handle().pipe(
            tap({
                next: () => write('success', 200),
                error: (error: { status?: number }) => write('failure', error?.status ?? 500),
            }),
        );
    }
}
