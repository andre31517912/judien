import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';
import { Resend } from 'resend';
import type { MessagingAdapter, SendSmsOptions, SendEmailOptions } from './messaging.interface';

/**
 * Production adapter.
 *
 * EMAIL  — Resend (set RESEND_API_KEY + RESEND_FROM_EMAIL)
 *
 * SMS    — provider-agnostic, controlled by SMS_PROVIDER env var:
 *            twilio   → uses TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER
 *            every8d  → stub ready for Every8d credentials (fill in after provider decision)
 *            (unset)  → logs a warning and skips; no crash
 *
 * Instantiated only when MOCK_MODE != 'true'.
 */
@Injectable()
export class ProductionMessagingAdapter implements MessagingAdapter {
  private readonly logger = new Logger(ProductionMessagingAdapter.name);

  // ── Email (Resend) ──────────────────────────────────────────────────────────
  private resend: Resend | null = null;

  // ── SMS (Twilio — only initialised when SMS_PROVIDER=twilio) ─────────────
  private twilioClient: ReturnType<typeof Twilio> | null = null;

  constructor() {
    // Lazy-init: only construct clients when credentials are present
    // so the app still boots in MOCK_MODE without any env vars set.
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    if (process.env.SMS_PROVIDER === 'twilio') {
      this.twilioClient = Twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!,
      );
    }
  }

  // ── SMS ─────────────────────────────────────────────────────────────────────
  async sendSms(opts: SendSmsOptions): Promise<string | null> {
    const provider = process.env.SMS_PROVIDER;

    if (provider === 'twilio') {
      return this.sendViaTwilio(opts);
    }

    if (provider === 'every8d') {
      return this.sendViaEvery8d(opts);
    }

    // No provider configured yet — skip gracefully
    this.logger.warn(
      `SMS_PROVIDER not configured — skipping SMS to ${opts.to}. ` +
      `Set SMS_PROVIDER=twilio or SMS_PROVIDER=every8d to enable.`,
    );
    return null;
  }

  private async sendViaTwilio(opts: SendSmsOptions): Promise<string | null> {
    try {
      const message = await this.twilioClient!.messages.create({
        from: process.env.TWILIO_FROM_NUMBER!,
        to: opts.to,
        body: opts.body,
      });
      this.logger.log(`[Twilio] SMS sent sid=${message.sid} to=${opts.to}`);
      return message.sid;
    } catch (err) {
      this.logger.error(`[Twilio] SMS failed to=${opts.to}`, err);
      return null;
    }
  }

  private async sendViaEvery8d(opts: SendSmsOptions): Promise<string | null> {
    // TODO: implement after provider decision
    // Docs: https://www.every8d.com/API_3.0/
    // Required env vars: EVERY8D_USER_ID, EVERY8D_PASSWORD, EVERY8D_FROM (optional)
    this.logger.warn(`[Every8d] SMS provider stub — not yet implemented. to=${opts.to}`);
    return null;
  }

  // ── Email (Resend) ──────────────────────────────────────────────────────────
  async sendEmail(opts: SendEmailOptions): Promise<string | null> {
    if (!this.resend) {
      this.logger.warn(`[Resend] RESEND_API_KEY not set — skipping email to ${opts.to}`);
      return null;
    }
    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Judien <noreply@judien.app>',
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? opts.text,
      });

      if (error) {
        this.logger.error(`[Resend] Email failed to=${opts.to}`, error);
        return null;
      }

      this.logger.log(`[Resend] Email sent id=${data?.id} to=${opts.to}`);
      return data?.id ?? null;
    } catch (err) {
      this.logger.error(`[Resend] Email failed to=${opts.to}`, err);
      return null;
    }
  }
}
