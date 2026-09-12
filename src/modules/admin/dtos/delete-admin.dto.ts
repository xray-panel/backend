import { createZodDto } from 'nestjs-zod';

import { DeleteAdminCommand } from '@libs/contracts/commands';

export class DeleteAdminResponseDto extends createZodDto(DeleteAdminCommand.ResponseSchema) {}
