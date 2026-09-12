import { ERRORS } from '@contract/constants';

import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { fail, ok, TResult } from '@common/types';

import { AdminEntity } from '@modules/admin/entities/admin.entity';

import { AdminRepository } from '../../repositories/admin.repository';
import { UpdateAdminCommand } from './update-admin.command';

@CommandHandler(UpdateAdminCommand)
export class UpdateAdminHandler implements ICommandHandler<
    UpdateAdminCommand,
    TResult<AdminEntity>
> {
    public readonly logger = new Logger(UpdateAdminHandler.name);

    constructor(private readonly adminRepository: AdminRepository) {}

    async execute(command: UpdateAdminCommand): Promise<TResult<AdminEntity>> {
        try {
            const result = await this.adminRepository.update({
                uuid: command.uuid,
                passwordHash: command.passwordHash,
            });

            return ok(result);
        } catch (error: unknown) {
            this.logger.error(error);
            return fail(ERRORS.UPDATE_ADMIN_ERROR);
        }
    }
}
