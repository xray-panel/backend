import { createZodDto } from 'nestjs-zod';

import { GetAdminsCommand } from '@libs/contracts/commands';

export class GetAdminsResponseDto extends createZodDto(GetAdminsCommand.ResponseSchema) {}
