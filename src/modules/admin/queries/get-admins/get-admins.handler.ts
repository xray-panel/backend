import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { fail, ok, TResult } from '@common/types';
import { ERRORS } from '@libs/contracts/constants';

import { AdminEntity } from '../../entities/admin.entity';
import { AdminRepository } from '../../repositories/admin.repository';
import { GetAdminsQuery } from './get-admins.query';

@QueryHandler(GetAdminsQuery)
export class GetAdminsHandler implements IQueryHandler<GetAdminsQuery, TResult<AdminEntity[]>> {
    private readonly logger = new Logger(GetAdminsHandler.name);

    constructor(private readonly adminRepository: AdminRepository) {}

    async execute(query: GetAdminsQuery): Promise<TResult<AdminEntity[]>> {
        try {
            const admins = await this.adminRepository.findByCriteria({ role: query.role });

            return ok(admins);
        } catch (error) {
            this.logger.error(error);
            return fail(ERRORS.GET_ADMINS_ERROR);
        }
    }
}
