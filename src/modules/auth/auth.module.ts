import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';

import { getJWTConfig } from '@common/config/jwt/jwt.config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { COMMANDS } from './commands';
import { LoginAttemptsService } from './login-attempts.service';
import { InjectRemnawaveSettingsMiddleware } from './middlewares/inject-remnawave-settings';
import { JwtStrategy } from './strategies';
import { TwoFactorController } from './two-factor.controller';

@Module({
    imports: [CqrsModule, JwtModule.registerAsync(getJWTConfig()), HttpModule],
    controllers: [AuthController, TwoFactorController],
    providers: [JwtStrategy, AuthService, LoginAttemptsService, ...COMMANDS],
})
export class AuthModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(InjectRemnawaveSettingsMiddleware).forRoutes(AuthController);
    }
}
