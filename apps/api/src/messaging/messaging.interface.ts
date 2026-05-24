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

export interface SendLineOptions {
  to: string;  // LINE userId
  text: string;
}

export interface MessagingAdapter {
  sendSms(opts: SendSmsOptions): Promise<string | null>;
  sendEmail(opts: SendEmailOptions): Promise<string | null>;
  sendLine?(opts: SendLineOptions): Promise<string | null>;
}
