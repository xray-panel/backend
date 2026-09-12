import { createZodDto } from 'nestjs-zod';

import { GetAuditLogCommand } from '@libs/contracts/commands';

export class GetAuditLogQueryDto extends createZodDto(GetAuditLogCommand.RequestQuerySchema) {}
export class GetAuditLogResponseDto extends createZodDto(GetAuditLogCommand.ResponseSchema) {}
