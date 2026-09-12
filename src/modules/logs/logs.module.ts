import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogsRepository } from './repositories/logs.repository';

@Module({
    // CqrsModule нужен guard'ам контроллера: JwtDefaultGuard зависит от QueryBus.
    imports: [CqrsModule],
    controllers: [LogsController],
    providers: [LogsRepository, LogsService],
})
export class LogsModule {}
