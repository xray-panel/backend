import { RemoveUserCommand } from '@xpanel/node-contract';

import { INodeConnectionOpts } from '@common/axios';

export interface IRemoveUserFromNodePayload {
    data: RemoveUserCommand.Request;
    node: INodeConnectionOpts;
}
