"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentListQuerySchema = exports.EventListQuerySchema = exports.UpdateProfileSchema = exports.BlastSchema = exports.SetRemindersSchema = exports.ReminderRuleSchema = exports.UpdateCommentSchema = exports.CreateCommentSchema = exports.RsvpSchema = exports.UpdateEventSchema = exports.CreateEventSchema = exports.LoginSchema = exports.SignupSchema = exports.phoneSchema = exports.normalizePhone = void 0;
const zod_1 = require("zod");
const libphonenumber_js_1 = require("libphonenumber-js");
// ─── Phone normalization ──────────────────────────────────────────────────────
/**
 * Accepts any phone number format (with spaces, dashes, leading zeros)
 * and normalises it to E.164, e.g. "+886912345678".
 * Defaults to Taiwan (+886) when no country code is present.
 */
const normalizePhone = (raw) => {
    const parsed = (0, libphonenumber_js_1.parsePhoneNumberFromString)(raw, 'TW');
    if (!parsed || !parsed.isValid())
        return null;
    return parsed.format('E.164');
};
exports.normalizePhone = normalizePhone;
exports.phoneSchema = zod_1.z
    .string()
    .min(5)
    .transform((val, ctx) => {
    const normalized = (0, exports.normalizePhone)(val);
    if (!normalized) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'Invalid phone number' });
        return zod_1.z.NEVER;
    }
    return normalized;
});
// ─── Auth ─────────────────────────────────────────────────────────────────────
exports.SignupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    phone: exports.phoneSchema,
    displayName: zod_1.z.string().max(100).optional(),
    preferredLanguage: zod_1.z.enum(['en', 'zh']).default('en'),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
// ─── Event ────────────────────────────────────────────────────────────────────
exports.CreateEventSchema = zod_1.z.object({
    title_en: zod_1.z.string().max(200).default(''),
    title_zh: zod_1.z.string().max(200).default(''),
    description_en: zod_1.z.string().max(10000).default(''),
    description_zh: zod_1.z.string().max(10000).default(''),
    location_en: zod_1.z.string().max(500).default(''),
    location_zh: zod_1.z.string().max(500).default(''),
    startAt: zod_1.z.string().datetime().optional().default(new Date().toISOString()),
    endAt: zod_1.z.string().datetime().nullable().optional(),
    timezone: zod_1.z.string().default('Asia/Taipei'),
    feeAmount: zod_1.z.number().nonnegative().nullable().optional(),
    feeCurrency: zod_1.z.string().length(3).default('TWD'),
    coverImageUrl: zod_1.z.string().url().nullable().optional(),
});
exports.UpdateEventSchema = exports.CreateEventSchema.partial();
// ─── RSVP ─────────────────────────────────────────────────────────────────────
exports.RsvpSchema = zod_1.z.object({
    status: zod_1.z.enum(['GOING', 'MAYBE', 'NO']),
});
// ─── Comment ──────────────────────────────────────────────────────────────────
exports.CreateCommentSchema = zod_1.z.object({
    body: zod_1.z.string().min(1).max(2000),
});
exports.UpdateCommentSchema = zod_1.z.object({
    body: zod_1.z.string().min(1).max(2000),
});
// ─── Reminder ─────────────────────────────────────────────────────────────────
exports.ReminderRuleSchema = zod_1.z.object({
    offsetMinutes: zod_1.z.number().int().positive(),
    channels: zod_1.z.array(zod_1.z.enum(['SMS', 'EMAIL'])).min(1),
    enabled: zod_1.z.boolean().default(true),
});
exports.SetRemindersSchema = zod_1.z.object({
    rules: zod_1.z.array(exports.ReminderRuleSchema),
});
// ─── Blast ────────────────────────────────────────────────────────────────────
exports.BlastSchema = zod_1.z.object({
    channels: zod_1.z.array(zod_1.z.enum(['SMS', 'EMAIL'])).min(1),
    /** Default 'rsvped' = all users who RSVPed any status; 'all' = all registered users */
    audience: zod_1.z.enum(['rsvped', 'all']).default('rsvped'),
    messageEn: zod_1.z.string().min(1).max(1600),
    messageZh: zod_1.z.string().min(1).max(1600),
});
// ─── Profile update ───────────────────────────────────────────────────────────
exports.UpdateProfileSchema = zod_1.z.object({
    phone: exports.phoneSchema.optional(),
    email: zod_1.z.string().email().optional(),
    displayName: zod_1.z.string().max(100).optional(),
    password: zod_1.z.string().min(8).max(128).optional(),
    preferredLanguage: zod_1.z.enum(['en', 'zh']).optional(),
    muteSms: zod_1.z.boolean().optional(),
    muteEmail: zod_1.z.boolean().optional(),
});
// ─── Query params ─────────────────────────────────────────────────────────────
exports.EventListQuerySchema = zod_1.z.object({
    scope: zod_1.z.enum(['future', 'past']).default('future'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    pageSize: zod_1.z.coerce.number().int().positive().max(50).default(20),
});
exports.CommentListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    pageSize: zod_1.z.coerce.number().int().positive().max(100).default(30),
});
//# sourceMappingURL=schemas.js.map