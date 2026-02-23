import { Injectable, Logger } from '@nestjs/common';
import type { MessagingAdapter, SendSmsOptions, SendEmailOptions } from './messaging.interface';

/**
 * Mock adapter – logs to console instead of calling real providers.
 * Used when MOCK_MODE=true or providers not configured.
 */
@Injectable()
export class MockMessagingAdapter implements MessagingAdapter {
  private readonly logger = new Logger(MockMessagingAdapter.name);

  async sendSms(opts: SendSmsOptions): Promise<string | null> {
    this.logger.log(`[MOCK SMS] to=${opts.to} body="${opts.body}"`);
    return `mock_sms_${Date.now()}`;
  }

  async sendEmail(opts: SendEmailOptions): Promise<string | null> {
    this.logger.log(
      `[MOCK EMAIL] to=${opts.to} subject="${opts.subject}" text="${opts.text}"`,
    );
    return `mock_email_${Date.now()}`;
  }
}
