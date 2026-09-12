import { ClearNodeLogsCommand } from '@contract/commands';
import { createZodDto } from 'nestjs-zod';

export class ClearNodeLogsParamDto extends createZodDto(ClearNodeLogsCommand.RequestParamSchema) {}
export class ClearNodeLogsResponseDto extends createZodDto(ClearNodeLogsCommand.ResponseSchema) {}
