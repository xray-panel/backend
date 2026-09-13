import { AddUsersCommand as AddUsersToNodeCommandSdk } from '@xlada/node-contract';

import { INodeConnectionOpts } from '@common/axios';

export interface IAddUsersToNodePayload {
    data: AddUsersToNodeCommandSdk.Request;
    node: INodeConnectionOpts;
}
