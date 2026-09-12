import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { COMMANDS } from './commands';
import { LogRetentionRepository } from './repositories/log-retention.repository';

@Module({
    imports: [CqrsModule],
    providers: [LogRetentionRepository, ...COMMANDS],
})
export class LogRetentionModule {}
