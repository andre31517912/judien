import { Injectable, Logger } from '@nestjs/common';
import type { MessagingAdapter, SendEmailOptions, SendLineOptions } from './messaging.interface';

/**
 * Mock adapter – logs to console instead of calling real providers.
 * Used when MOCK_MODE=true or providers not configured.
 */
@Injectable()
export class MockMessagingAdapter implements MessagingAdapter {
  private readonly logger = new Logger(MockMessagingAdapter.name);

  async sendEmail(opts: SendEmailOptions): Promise<string | null> {
    this.logger.log(
      `[MOCK EMAIL] to=${opts.to} subject="${opts.subject}" text="${opts.text}"`,
    );
    return `mock_email_${Date.now()}`;
  }

  async sendLine(opts: SendLineOptions): Promise<string | null> {
    this.logger.log(`[MOCK LINE] to=${opts.to} text="${opts.text}"`);
    return `mock_line_${Date.now()}`;
  }
}
