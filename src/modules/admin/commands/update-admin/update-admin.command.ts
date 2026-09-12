export class UpdateAdminCommand {
    constructor(
        public readonly uuid: string,
        /** Уже готовый хеш пароля: открытый пароль в CQRS-слой не попадает. */
        public readonly passwordHash: string,
    ) {}
}
