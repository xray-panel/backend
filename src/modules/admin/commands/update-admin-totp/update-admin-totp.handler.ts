import { ERRORS } from '@contract/constants';

import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { fail, ok, TResult } from '@common/types';

import { AdminEntity } from '@modules/admin/entities/admin.entity';

import { AdminRepository } from '../../repositories/admin.repository';
import { UpdateAdminTotpCommand } from './update-admin-totp.command';

@CommandHandler(UpdateAdminTotpCommand)
export class UpdateAdminTotpHandler implements ICommandHandler<
    UpdateAdminTotpCommand,
    TResult<AdminEntity>
> {
    public readonly logger = new Logger(UpdateAdminTotpHandler.name);

    constructor(private readonly adminRepository: AdminRepository) {}

    async execute(command: UpdateAdminTotpCommand): Promise<TResult<AdminEntity>> {
        try {
            const result = await this.adminRepository.update({
                uuid: command.uuid,
                totpSecret: command.totpSecret,
                totpEnabled: command.totpEnabled,
            });

            return ok(result);
        } catch (error: unknown) {
            this.logger.error(error);
            return fail(ERRORS.UPDATE_ADMIN_ERROR);
        }
    }
}
