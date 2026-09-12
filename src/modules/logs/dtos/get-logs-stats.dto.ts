import { createZodDto } from 'nestjs-zod';

import { GetLogsStatsCommand } from '@libs/contracts/commands';

export class GetLogsStatsResponseDto extends createZodDto(GetLogsStatsCommand.ResponseSchema) {}
