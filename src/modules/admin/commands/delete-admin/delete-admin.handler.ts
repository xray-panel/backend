import { ERRORS } from '@contract/constants';

import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { fail, ok, TResult } from '@common/types';

import { AdminRepository } from '../../repositories/admin.repository';
import { DeleteAdminCommand } from './delete-admin.command';

@CommandHandler(DeleteAdminCommand)
export class DeleteAdminHandler implements ICommandHandler<DeleteAdminCommand, TResult<boolean>> {
    public readonly logger = new Logger(DeleteAdminHandler.name);

    constructor(private readonly adminRepository: AdminRepository) {}

    async execute(command: DeleteAdminCommand): Promise<TResult<boolean>> {
        try {
            const result = await this.adminRepository.deleteByUUID(command.uuid);

            return ok(result);
        } catch (error: unknown) {
            this.logger.error(error);
            return fail(ERRORS.DELETE_ADMIN_ERROR);
        }
    }
}
