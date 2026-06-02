import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type { MessagingAdapter, SendEmailOptions, SendLineOptions } from './messaging.interface';

/**
 * Production adapter.
 *
 * EMAIL  — Resend (set RESEND_API_KEY + RESEND_FROM_EMAIL)
 * LINE   — LINE Messaging API (set LINE_MESSAGING_CHANNEL_ACCESS_TOKEN)
 *
 * Instantiated only when MOCK_MODE != 'true'.
 */
@Injectable()
export class ProductionMessagingAdapter implements MessagingAdapter {
  private readonly logger = new Logger(ProductionMessagingAdapter.name);

  // ── Email (Resend) ──────────────────────────────────────────────────────────
  private resend: Resend | null = null;

  constructor() {
    // Lazy-init: only construct clients when credentials are present
    // so the app still boots in MOCK_MODE without any env vars set.
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
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

  // ── LINE Messaging API ──────────────────────────────────────────────────────
  async sendLine(opts: SendLineOptions): Promise<string | null> {
    const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      this.logger.warn(`[LINE] LINE_MESSAGING_CHANNEL_ACCESS_TOKEN not set — skipping LINE push to ${opts.to}`);
      return null;
    }
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: opts.to,
          messages: [{ type: 'text', text: opts.text }],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`[LINE] Push failed to=${opts.to} status=${res.status} body=${body}`);
        return null;
      }
      this.logger.log(`[LINE] Push sent to=${opts.to}`);
      // LINE push doesn't return a message ID in the response body, use timestamp
      return `line_${Date.now()}`;
    } catch (err) {
      this.logger.error(`[LINE] Push failed to=${opts.to}`, err);
      return null;
    }
  }
}
