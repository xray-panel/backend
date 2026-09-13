import { createZodDto } from 'nestjs-zod';

import {
    DisableTwoFactorCommand,
    GetTwoFactorStatusCommand,
    SetupTwoFactorCommand,
    TwoFactorLoginCommand,
    VerifyTwoFactorCommand,
} from '@libs/contracts/commands';

export class TwoFactorStatusResponseDto extends createZodDto(
    GetTwoFactorStatusCommand.ResponseSchema,
) {}

export class SetupTwoFactorResponseDto extends createZodDto(
    SetupTwoFactorCommand.ResponseSchema,
) {}

export class VerifyTwoFactorBodyDto extends createZodDto(
    VerifyTwoFactorCommand.RequestBodySchema,
) {}
export class VerifyTwoFactorResponseDto extends createZodDto(
    VerifyTwoFactorCommand.ResponseSchema,
) {}

export class DisableTwoFactorBodyDto extends createZodDto(
    DisableTwoFactorCommand.RequestBodySchema,
) {}
export class DisableTwoFactorResponseDto extends createZodDto(
    DisableTwoFactorCommand.ResponseSchema,
) {}

export class TwoFactorLoginBodyDto extends createZodDto(TwoFactorLoginCommand.RequestBodySchema) {}
export class TwoFactorLoginResponseDto extends createZodDto(
    TwoFactorLoginCommand.ResponseSchema,
) {}
