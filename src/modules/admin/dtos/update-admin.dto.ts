import { createZodDto } from 'nestjs-zod';

import { UpdateAdminCommand } from '@libs/contracts/commands';

export class UpdateAdminBodyDto extends createZodDto(UpdateAdminCommand.RequestBodySchema) {}
export class UpdateAdminResponseDto extends createZodDto(UpdateAdminCommand.ResponseSchema) {}
