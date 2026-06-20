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
  email: z.string().email().optional(),
  password: z.string().min(8).max(128),
  phone: phoneSchema,
  displayName: z.string().max(100).optional(),
  preferredLanguage: z.enum(['en', 'zh']).default('en'),
  inviteToken: z.string().optional(),
});
export type SignupDto = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  identifier: z.string().min(1), // email or phone number
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginSchema>;

// ─── Event ────────────────────────────────────────────────────────────────────

export const CreateEventSchema = z.object({
  groupId: z.string().min(1).optional(),
  seriesId: z.string().min(1).optional(),
  partNumber: z.number().int().positive().optional(),
  title: z.string().max(200).default(''),
  description: z.string().max(10000).default(''),
  location: z.string().max(500).default(''),
  startAt: z.string().datetime().optional().default(new Date().toISOString()),
  endAt: z.string().datetime().nullable().optional(),
  timezone: z.string().default('Asia/Taipei'),
  feeAmount: z.number().nonnegative().nullable().optional(),
  feeCurrency: z.string().length(3).default('TWD'),
  coverImageUrl: z.string().url().nullable().optional(),
  commentsEnabled: z.boolean().default(true),
  messagingEnabled: z.boolean().default(true),
});
export type CreateEventDto = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = CreateEventSchema.partial();
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;

// ─── RSVP ─────────────────────────────────────────────────────────────────────

export const RsvpSchema = z.object({
  status: z.enum(['GOING', 'NO']),
  declineReason: z.string().max(500).optional(),
});
export type RsvpDto = z.infer<typeof RsvpSchema>;

export const GuestRsvpIdentitySchema = z.object({
  name: z.string().min(1).max(100),
  phoneE164: phoneSchema,
  email: z.string().email(),
});
export type GuestRsvpIdentityDto = z.infer<typeof GuestRsvpIdentitySchema>;

export const SharedEventRsvpSchema = z.object({
  status: z.enum(['GOING', 'NO']),
  guest: GuestRsvpIdentitySchema.optional(),
});
export type SharedEventRsvpDto = z.infer<typeof SharedEventRsvpSchema>;

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
  channels: z.array(z.enum(['EMAIL', 'LINE'])).min(1),
  enabled: z.boolean().default(true),
});
export type ReminderRuleDto = z.infer<typeof ReminderRuleSchema>;

export const SetRemindersSchema = z.object({
  rules: z.array(ReminderRuleSchema),
});
export type SetRemindersDto = z.infer<typeof SetRemindersSchema>;

// ─── Blast ────────────────────────────────────────────────────────────────────

export const BlastSchema = z.object({
  channels: z.array(z.enum(['EMAIL', 'LINE', 'IN_APP'])).min(1),
  /** 'rsvped' = users who RSVPed GOING; 'invited' = all group members / direct invitees */
  audience: z.enum(['rsvped', 'invited']).default('rsvped'),
  message: z.string().min(1).max(2000),
});
export type BlastDto = z.infer<typeof BlastSchema>;

// ─── Bulk Member Invite ───────────────────────────────────────────────────────

export const BulkInviteMembersSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(500),
});
export type BulkInviteMembersDto = z.infer<typeof BulkInviteMembersSchema>;

// ─── News ────────────────────────────────────────────────────────────────────

export const CreateNewsSchema = z.object({
  groupId: z.string().min(1).optional(),
  title: z.string().max(300).default(''),
  body: z.string().max(10000).default(''),
  coverImageUrl: z.string().url().nullable().optional(),
});
export type CreateNewsDto = z.infer<typeof CreateNewsSchema>;

export const UpdateNewsSchema = CreateNewsSchema.partial();
export type UpdateNewsDto = z.infer<typeof UpdateNewsSchema>;

// ─── Profile update ───────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  phone: phoneSchema.nullable().optional(),   // null = clear the phone number
  email: z.string().email().nullable().optional(), // null = clear the email
  displayName: z.string().max(100).optional(),
  password: z.string().min(8).max(128).optional(),
  preferredLanguage: z.enum(['en', 'zh']).optional(),
  colorTheme: z.enum(['light', 'dark']).optional(),
  muteEmail: z.boolean().optional(),
  muteLinePush: z.boolean().optional(),
  muteInAppNotifications: z.boolean().optional(),
  photoUrl: z.string().nullable().optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// ─── Query params ─────────────────────────────────────────────────────────────

export const EventListQuerySchema = z.object({
  scope: z.enum(['future', 'past']).default('future'),
  groupId: z.string().min(1).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type EventListQuery = z.infer<typeof EventListQuerySchema>;

export const NewsListQuerySchema = z.object({
  groupId: z.string().min(1).optional(),
  q: z.string().optional(),
});
export type NewsListQuery = z.infer<typeof NewsListQuerySchema>;

// ─── Groups ──────────────────────────────────────────────────────────────────

export const CreateGroupSchema = z.object({
  pid: z.string().min(3).max(40),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  photoUrl: z.string().url().nullable().optional(),
  discoverableBySearch: z.boolean().optional().default(false),
  adminUserIds: z.array(z.string().min(1)).optional().default([]),
  parentGroupId: z.string().optional(),
  initialMemberIds: z.array(z.string().min(1)).optional().default([]),
});
export type CreateGroupDto = z.infer<typeof CreateGroupSchema>;

export const UpdateGroupSettingsSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional(),
  photoUrl: z.string().url().nullable().optional(),
  discoverableBySearch: z.boolean().optional(),
});
export type UpdateGroupSettingsDto = z.infer<typeof UpdateGroupSettingsSchema>;

export const InviteGroupMembersSchema = z.object({
  invites: z.array(
    z.object({
      email: z.string().email().optional(),
      phoneE164: z.string().min(5).optional(),
      userId: z.string().min(1).optional(),
      role: z.enum(['GROUP_ADMIN', 'GROUP_MEMBER']).optional().default('GROUP_MEMBER'),
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
  role: z.enum(['GROUP_ADMIN', 'GROUP_MEMBER']),
});
export type ChangeGroupMemberRoleDto = z.infer<typeof ChangeGroupMemberRoleSchema>;

export const AddMemberDirectlySchema = z.object({
  identifier: z.string().min(1),
  role: z.enum(['GROUP_ADMIN', 'GROUP_MEMBER']).default('GROUP_MEMBER'),
});
export type AddMemberDirectlyDto = z.infer<typeof AddMemberDirectlySchema>;

export const CreateAndAddMemberSchema = z
  .object({
    displayName: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    role: z.enum(['GROUP_ADMIN', 'GROUP_MEMBER']).default('GROUP_MEMBER'),
    password: z.string().min(6).optional(), // if omitted, a random password is generated
  })
  .refine((d) => d.phone || d.email, {
    message: 'At least one of phone or email is required.',
  });
export type CreateAndAddMemberDto = z.infer<typeof CreateAndAddMemberSchema>;

export const BulkCreateAndAddMembersSchema = z
  .object({
    members: z
      .array(
        z.object({
          displayName: z.string().min(1),
          email: z.string().email().optional(),
          phone: z.string().optional(),
        }).refine((d) => d.email || d.phone, { message: 'Each member needs email or phone.' }),
      )
      .min(1)
      .max(200),
    passwordMode: z.enum(['shared', 'random']),
    sharedPassword: z.string().min(6).optional(),
    role: z.enum(['GROUP_ADMIN', 'GROUP_MEMBER']).default('GROUP_MEMBER'),
  })
  .refine((d) => d.passwordMode !== 'shared' || !!d.sharedPassword, {
    message: 'sharedPassword is required when passwordMode is shared.',
  });
export type BulkCreateAndAddMembersDto = z.infer<typeof BulkCreateAndAddMembersSchema>;

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

// ─── EventSeries ─────────────────────────────────────────────────────────────

export const CreateEventSeriesSchema = z.object({
  title: z.string().min(1).max(200),
  groupId: z.string().min(1).optional(),
});
export type CreateEventSeriesDto = z.infer<typeof CreateEventSeriesSchema>;

export const LinkEventToSeriesSchema = z.object({
  seriesId: z.string().min(1),
  partNumber: z.number().int().positive(),
});
export type LinkEventToSeriesDto = z.infer<typeof LinkEventToSeriesSchema>;

// ─── Subgroup ─────────────────────────────────────────────────────────────────

export const SetParentGroupSchema = z.object({
  parentGroupId: z.string().min(1).nullable(),
});
export type SetParentGroupDto = z.infer<typeof SetParentGroupSchema>;

export const CreateGroupRelationshipRequestSchema = z.object({
  parentGroupId: z.string().min(1),
});
export type CreateGroupRelationshipRequestDto = z.infer<typeof CreateGroupRelationshipRequestSchema>;

export const ReviewGroupRelationshipRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
});
export type ReviewGroupRelationshipRequestDto = z.infer<typeof ReviewGroupRelationshipRequestSchema>;

export const UpdateGroupNicknameSchema = z.object({
  groupNickname: z.string().max(100).nullable(),
});
export type UpdateGroupNicknameDto = z.infer<typeof UpdateGroupNicknameSchema>;

// ─── Guest Login ──────────────────────────────────────────────────────────────

export const GuestGroupJoinSchema = z.object({
  groupInviteToken: z.string().min(1),
  displayName: z.string().min(1).max(100).optional(),
  phoneE164: phoneSchema.optional(),
  email: z.string().email().optional(),
}).refine((x) => Boolean(x.phoneE164 || x.email), {
  message: 'At least one of phoneE164 or email is required.',
});
export type GuestGroupJoinDto = z.infer<typeof GuestGroupJoinSchema>;

// ─── Platform Invites ─────────────────────────────────────────────────────────

export const CreateInviteSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  expiresInHours: z.number().int().positive().max(8760).default(48),
});
export type CreateInviteDto = z.infer<typeof CreateInviteSchema>;
