import { createZodDto } from 'nestjs-zod';

import { CleanLogsCommand } from '@libs/contracts/commands';

export class CleanLogsBodyDto extends createZodDto(CleanLogsCommand.RequestBodySchema) {}
export class CleanLogsResponseDto extends createZodDto(CleanLogsCommand.ResponseSchema) {}
