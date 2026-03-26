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
  displayName: z.string().max(100).optional(),
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
  groupId: z.string().min(1).optional(),
  title_en: z.string().max(200).default(''),
  title_zh: z.string().max(200).default(''),
  description_en: z.string().max(10000).default(''),
  description_zh: z.string().max(10000).default(''),
  location_en: z.string().max(500).default(''),
  location_zh: z.string().max(500).default(''),
  startAt: z.string().datetime().optional().default(new Date().toISOString()),
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
  replyToId: z.string().optional(),
});
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>;

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

// ─── News ────────────────────────────────────────────────────────────────────

export const CreateNewsSchema = z.object({
  groupId: z.string().min(1),
  title_en: z.string().max(300).default(''),
  title_zh: z.string().max(300).default(''),
  body_en: z.string().max(10000).default(''),
  body_zh: z.string().max(10000).default(''),
});
export type CreateNewsDto = z.infer<typeof CreateNewsSchema>;

export const UpdateNewsSchema = CreateNewsSchema.partial();
export type UpdateNewsDto = z.infer<typeof UpdateNewsSchema>;

// ─── Profile update ───────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  phone: phoneSchema.optional(),
  email: z.string().email().optional(),
  displayName: z.string().max(100).optional(),
  password: z.string().min(8).max(128).optional(),
  preferredLanguage: z.enum(['en', 'zh']).optional(),
  muteSms: z.boolean().optional(),
  muteEmail: z.boolean().optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// ─── Query params ─────────────────────────────────────────────────────────────

export const EventListQuerySchema = z.object({
  scope: z.enum(['future', 'past']).default('future'),
  groupId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type EventListQuery = z.infer<typeof EventListQuerySchema>;

export const NewsListQuerySchema = z.object({
  groupId: z.string().min(1).optional(),
});
export type NewsListQuery = z.infer<typeof NewsListQuerySchema>;

// ─── Groups ──────────────────────────────────────────────────────────────────

export const CreateGroupSchema = z.object({
  pid: z.string().min(3).max(40),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  discoverableBySearch: z.boolean().optional().default(false),
  memberDataPrivate: z.boolean().optional().default(false),
  adminUserIds: z.array(z.string().min(1)).optional().default([]),
});
export type CreateGroupDto = z.infer<typeof CreateGroupSchema>;

export const UpdateGroupSettingsSchema = z.object({
  discoverableBySearch: z.boolean().optional(),
  memberDataPrivate: z.boolean().optional(),
});
export type UpdateGroupSettingsDto = z.infer<typeof UpdateGroupSettingsSchema>;

export const InviteGroupMembersSchema = z.object({
  invites: z.array(
    z.object({
      email: z.string().email().optional(),
      phoneE164: z.string().min(5).optional(),
      userId: z.string().min(1).optional(),
      role: z.enum(['GROUP_ADMIN', 'MEMBER']).optional().default('MEMBER'),
    }).refine((x) => Boolean(x.email || x.phoneE164 || x.userId), {
      message: 'At least one of email, phoneE164, or userId is required.',
    })
  ).min(1),
});
export type InviteGroupMembersDto = z.infer<typeof InviteGroupMembersSchema>;

export const RespondGroupInviteSchema = z.object({
  action: z.enum(['accept', 'decline']),
});
export type RespondGroupInviteDto = z.infer<typeof RespondGroupInviteSchema>;

export const CreateGroupJoinRequestSchema = z.object({
  note: z.string().max(1000).optional().default(''),
});
export type CreateGroupJoinRequestDto = z.infer<typeof CreateGroupJoinRequestSchema>;

export const ReviewGroupJoinRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
});
export type ReviewGroupJoinRequestDto = z.infer<typeof ReviewGroupJoinRequestSchema>;

export const ChangeGroupMemberRoleSchema = z.object({
  role: z.enum(['GROUP_ADMIN', 'MEMBER']),
});
export type ChangeGroupMemberRoleDto = z.infer<typeof ChangeGroupMemberRoleSchema>;

export const CommentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
});
export type CommentListQuery = z.infer<typeof CommentListQuerySchema>;

// ─── GroupMessage ────────────────────────────────────────────────────────────

export const CreateGroupMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});
export type CreateGroupMessageDto = z.infer<typeof CreateGroupMessageSchema>;

export const GroupMessageListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});
export type GroupMessageListQuery = z.infer<typeof GroupMessageListQuerySchema>;

// ─── Event Invites ───────────────────────────────────────────────────────────

export const CreateEventInviteSchema = z.object({
  eventId: z.string().min(1),
});
export type CreateEventInviteDto = z.infer<typeof CreateEventInviteSchema>;

export const AcceptEventInviteSchema = z.object({
  displayName: z.string().max(100).min(1),
  phoneE164: phoneSchema,
  email: z.string().email().optional(),
});
export type AcceptEventInviteDto = z.infer<typeof AcceptEventInviteSchema>;
