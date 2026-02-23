import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// ─── Phone normalization ──────────────────────────────────────────────────────

/**
 * Accepts any phone number format (with spaces, dashes, leading zeros)
 * and normalises it to E.164, e.g. "+886912345678".
 * Defaults to Taiwan (+886) when no country code is present.
 */
export const normalizePhone = (raw: string): string | null => {
  const parsed = parsePhoneNumberFromString(raw, 'TW');
  if (!parsed || !parsed.isValid()) return null;
  return parsed.format('E.164');
};

export const phoneSchema = z
  .string()
  .min(5)
  .transform((val, ctx) => {
    const normalized = normalizePhone(val);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid phone number' });
      return z.NEVER;
    }
    return normalized;
  });

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: phoneSchema,
  preferredLanguage: z.enum(['en', 'zh']).default('en'),
});
export type SignupDto = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginSchema>;

// ─── Event ────────────────────────────────────────────────────────────────────

export const CreateEventSchema = z.object({
  title_en: z.string().min(1).max(200),
  title_zh: z.string().min(1).max(200),
  description_en: z.string().max(10000).default(''),
  description_zh: z.string().max(10000).default(''),
  location_en: z.string().max(500).default(''),
  location_zh: z.string().max(500).default(''),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  timezone: z.string().default('Asia/Taipei'),
  feeAmount: z.number().nonnegative().nullable().optional(),
  feeCurrency: z.string().length(3).default('TWD'),
  coverImageUrl: z.string().url().nullable().optional(),
});
export type CreateEventDto = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = CreateEventSchema.partial();
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;

// ─── RSVP ─────────────────────────────────────────────────────────────────────

export const RsvpSchema = z.object({
  status: z.enum(['GOING', 'MAYBE', 'NO']),
});
export type RsvpDto = z.infer<typeof RsvpSchema>;

// ─── Comment ──────────────────────────────────────────────────────────────────

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

// ─── Reminder ─────────────────────────────────────────────────────────────────

export const ReminderRuleSchema = z.object({
  offsetMinutes: z.number().int().positive(),
  channels: z.array(z.enum(['SMS', 'EMAIL'])).min(1),
  enabled: z.boolean().default(true),
});
export type ReminderRuleDto = z.infer<typeof ReminderRuleSchema>;

export const SetRemindersSchema = z.object({
  rules: z.array(ReminderRuleSchema),
});
export type SetRemindersDto = z.infer<typeof SetRemindersSchema>;

// ─── Blast ────────────────────────────────────────────────────────────────────

export const BlastSchema = z.object({
  channels: z.array(z.enum(['SMS', 'EMAIL'])).min(1),
  /** Default 'rsvped' = all users who RSVPed any status; 'all' = all registered users */
  audience: z.enum(['rsvped', 'all']).default('rsvped'),
  messageEn: z.string().min(1).max(1600),
  messageZh: z.string().min(1).max(1600),
});
export type BlastDto = z.infer<typeof BlastSchema>;

// ─── Profile update ───────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  phone: phoneSchema.optional(),
  email: z.string().email().optional(),
  preferredLanguage: z.enum(['en', 'zh']).optional(),
  notificationsMuted: z.boolean().optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// ─── Query params ─────────────────────────────────────────────────────────────

export const EventListQuerySchema = z.object({
  scope: z.enum(['future', 'past']).default('future'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type EventListQuery = z.infer<typeof EventListQuerySchema>;

export const CommentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
});
export type CommentListQuery = z.infer<typeof CommentListQuerySchema>;
