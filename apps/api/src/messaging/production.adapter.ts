import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';
import type { MessagingAdapter, SendSmsOptions, SendEmailOptions } from './messaging.interface';

/**
 * Production adapter using Twilio for SMS and SendGrid for email.
 * Instantiated only when MOCK_MODE != 'true'.
 */
@Injectable()
export class ProductionMessagingAdapter implements MessagingAdapter {
  private readonly logger = new Logger(ProductionMessagingAdapter.name);
  private readonly twilioClient: ReturnType<typeof Twilio>;

  constructor() {
    this.twilioClient = Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
  }

  async sendSms(opts: SendSmsOptions): Promise<string | null> {
    try {
      const message = await this.twilioClient.messages.create({
        from: process.env.TWILIO_FROM_NUMBER!,
        to: opts.to,
        body: opts.body,
      });
      this.logger.log(`SMS sent sid=${message.sid} to=${opts.to}`);
      return message.sid;
    } catch (err) {
      this.logger.error(`SMS failed to=${opts.to}`, err);
      return null;
    }
  }

  async sendEmail(opts: SendEmailOptions): Promise<string | null> {
    // Dynamic import to avoid top-level init before env is loaded
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    try {
      const [response] = await sgMail.send({
        from: {
          email: process.env.SENDGRID_FROM_EMAIL!,
          name: process.env.SENDGRID_FROM_NAME ?? 'Judien',
        },
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? opts.text,
      });
      const msgId = response.headers['x-message-id'] as string | undefined;
      this.logger.log(`Email sent id=${msgId} to=${opts.to}`);
      return msgId ?? null;
    } catch (err) {
      this.logger.error(`Email failed to=${opts.to}`, err);
      return null;
    }
  }
}
