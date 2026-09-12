import { createZodDto } from 'nestjs-zod';

import { CreateAdminCommand } from '@libs/contracts/commands';

export class CreateAdminBodyDto extends createZodDto(CreateAdminCommand.RequestBodySchema) {}
export class CreateAdminResponseDto extends createZodDto(CreateAdminCommand.ResponseSchema) {}
