import { TRoleTypes } from '@libs/contracts/constants';

export class GetAdminsQuery {
    constructor(public readonly role: TRoleTypes) {}
}
