export class UpdateAdminTotpCommand {
    constructor(
        public readonly uuid: string,
        /**
         * Уже зашифрованный секрет (encryptTotpSecret) либо null при отключении.
         * Открытый секрет в CQRS-слой не попадает.
         */
        public readonly totpSecret: null | string,
        public readonly totpEnabled: boolean,
    ) {}
}
