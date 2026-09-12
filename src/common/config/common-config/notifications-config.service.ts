import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TAllEventChannels, TAllEvents } from '@libs/contracts/constants';

import { NotificationsConfig } from '../app-config';

@Injectable()
export class NotificationsConfigService {
    private readonly config: NotificationsConfig;

    constructor(private readonly configService: ConfigService) {
        this.config = this.configService.getOrThrow<NotificationsConfig>('notifications');
    }

    isEnabled(eventName: TAllEvents, channel: TAllEventChannels): boolean {
        const eventConfig = this.config.events[eventName];

        if (eventConfig) {
            return eventConfig[channel];
        }

        // Событие, отсутствующее в конфиге, считается выключенным. Раньше
        // возвращалось true, из-за чего отключить уведомление удалением строки
        // из notifications-config.yml было невозможно: событие всё равно
        // уходило во внешние каналы.
        return false;
    }

    getWebhookUrls(eventName: TAllEvents): string[] {
        return this.config.events[eventName]?.additionalWebhookUrls ?? [];
    }
}
