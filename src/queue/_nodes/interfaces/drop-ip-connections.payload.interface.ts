import { DropIpsCommand } from '@xpanel/node-contract';

import { INodeConnectionOpts } from '@common/axios';

export interface IDropIpsConnectionsPayload {
    data: DropIpsCommand.Request;
    node: INodeConnectionOpts;
}
