export interface SendSmsOptions {
  to: string;       // E.164
  body: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MessagingAdapter {
  sendSms(opts: SendSmsOptions): Promise<string | null>; // returns providerMessageId
  sendEmail(opts: SendEmailOptions): Promise<string | null>;
}
