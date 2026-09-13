export class AuthResponseModel {
    public readonly accessToken: null | string;
    public readonly twoFactorRequired: boolean;
    public readonly twoFactorTicket: null | string;

    constructor(data: AuthResponseModel) {
        this.accessToken = data.accessToken;
        this.twoFactorRequired = data.twoFactorRequired;
        this.twoFactorTicket = data.twoFactorTicket;
    }
}
