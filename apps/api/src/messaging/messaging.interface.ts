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
  sendEmail(opts: SendEmailOptions): Promise<string | null>;
  sendLine?(opts: SendLineOptions): Promise<string | null>;
}
