import { AddUserCommand as AddUserToNodeCommandSdk } from '@xlada/node-contract';

import { INodeConnectionOpts } from '@common/axios';

export interface IAddUserToNodePayload {
    data: AddUserToNodeCommandSdk.Request;
    node: INodeConnectionOpts;
}
