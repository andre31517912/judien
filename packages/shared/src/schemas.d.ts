import { z } from 'zod';
/**
 * Accepts any phone number format (with spaces, dashes, leading zeros)
 * and normalises it to E.164, e.g. "+886912345678".
 * Defaults to Taiwan (+886) when no country code is present.
 */
export declare const normalizePhone: (raw: string) => string | null;
export declare const phoneSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const SignupSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    phone: z.ZodEffects<z.ZodString, string, string>;
    displayName: z.ZodOptional<z.ZodString>;
    preferredLanguage: z.ZodDefault<z.ZodEnum<["en", "zh"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    phone: string;
    preferredLanguage: "en" | "zh";
    displayName?: string | undefined;
}, {
    email: string;
    password: string;
    phone: string;
    displayName?: string | undefined;
    preferredLanguage?: "en" | "zh" | undefined;
}>;
export type SignupDto = z.infer<typeof SignupSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginDto = z.infer<typeof LoginSchema>;
export declare const CreateEventSchema: z.ZodObject<{
    title_en: z.ZodDefault<z.ZodString>;
    title_zh: z.ZodDefault<z.ZodString>;
    description_en: z.ZodDefault<z.ZodString>;
    description_zh: z.ZodDefault<z.ZodString>;
    location_en: z.ZodDefault<z.ZodString>;
    location_zh: z.ZodDefault<z.ZodString>;
    startAt: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    endAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timezone: z.ZodDefault<z.ZodString>;
    feeAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    feeCurrency: z.ZodDefault<z.ZodString>;
    coverImageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title_en: string;
    title_zh: string;
    description_en: string;
    description_zh: string;
    location_en: string;
    location_zh: string;
    startAt: string;
    timezone: string;
    feeCurrency: string;
    endAt?: string | null | undefined;
    feeAmount?: number | null | undefined;
    coverImageUrl?: string | null | undefined;
}, {
    title_en?: string | undefined;
    title_zh?: string | undefined;
    description_en?: string | undefined;
    description_zh?: string | undefined;
    location_en?: string | undefined;
    location_zh?: string | undefined;
    startAt?: string | undefined;
    endAt?: string | null | undefined;
    timezone?: string | undefined;
    feeAmount?: number | null | undefined;
    feeCurrency?: string | undefined;
    coverImageUrl?: string | null | undefined;
}>;
export type CreateEventDto = z.infer<typeof CreateEventSchema>;
export declare const UpdateEventSchema: z.ZodObject<{
    title_en: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    title_zh: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    description_en: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    description_zh: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    location_en: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    location_zh: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    startAt: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    endAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    timezone: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    feeAmount: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    feeCurrency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    coverImageUrl: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    title_en?: string | undefined;
    title_zh?: string | undefined;
    description_en?: string | undefined;
    description_zh?: string | undefined;
    location_en?: string | undefined;
    location_zh?: string | undefined;
    startAt?: string | undefined;
    endAt?: string | null | undefined;
    timezone?: string | undefined;
    feeAmount?: number | null | undefined;
    feeCurrency?: string | undefined;
    coverImageUrl?: string | null | undefined;
}, {
    title_en?: string | undefined;
    title_zh?: string | undefined;
    description_en?: string | undefined;
    description_zh?: string | undefined;
    location_en?: string | undefined;
    location_zh?: string | undefined;
    startAt?: string | undefined;
    endAt?: string | null | undefined;
    timezone?: string | undefined;
    feeAmount?: number | null | undefined;
    feeCurrency?: string | undefined;
    coverImageUrl?: string | null | undefined;
}>;
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;
export declare const RsvpSchema: z.ZodObject<{
    status: z.ZodEnum<["GOING", "MAYBE", "NO"]>;
}, "strip", z.ZodTypeAny, {
    status: "GOING" | "MAYBE" | "NO";
}, {
    status: "GOING" | "MAYBE" | "NO";
}>;
export type RsvpDto = z.infer<typeof RsvpSchema>;
export declare const CreateCommentSchema: z.ZodObject<{
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    body: string;
}, {
    body: string;
}>;
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;
export declare const UpdateCommentSchema: z.ZodObject<{
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    body: string;
}, {
    body: string;
}>;
export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>;
export declare const ReminderRuleSchema: z.ZodObject<{
    offsetMinutes: z.ZodNumber;
    channels: z.ZodArray<z.ZodEnum<["SMS", "EMAIL"]>, "many">;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    offsetMinutes: number;
    channels: ("SMS" | "EMAIL")[];
    enabled: boolean;
}, {
    offsetMinutes: number;
    channels: ("SMS" | "EMAIL")[];
    enabled?: boolean | undefined;
}>;
export type ReminderRuleDto = z.infer<typeof ReminderRuleSchema>;
export declare const SetRemindersSchema: z.ZodObject<{
    rules: z.ZodArray<z.ZodObject<{
        offsetMinutes: z.ZodNumber;
        channels: z.ZodArray<z.ZodEnum<["SMS", "EMAIL"]>, "many">;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        offsetMinutes: number;
        channels: ("SMS" | "EMAIL")[];
        enabled: boolean;
    }, {
        offsetMinutes: number;
        channels: ("SMS" | "EMAIL")[];
        enabled?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rules: {
        offsetMinutes: number;
        channels: ("SMS" | "EMAIL")[];
        enabled: boolean;
    }[];
}, {
    rules: {
        offsetMinutes: number;
        channels: ("SMS" | "EMAIL")[];
        enabled?: boolean | undefined;
    }[];
}>;
export type SetRemindersDto = z.infer<typeof SetRemindersSchema>;
export declare const BlastSchema: z.ZodObject<{
    channels: z.ZodArray<z.ZodEnum<["SMS", "EMAIL"]>, "many">;
    /** Default 'rsvped' = all users who RSVPed any status; 'all' = all registered users */
    audience: z.ZodDefault<z.ZodEnum<["rsvped", "all"]>>;
    messageEn: z.ZodString;
    messageZh: z.ZodString;
}, "strip", z.ZodTypeAny, {
    channels: ("SMS" | "EMAIL")[];
    audience: "rsvped" | "all";
    messageEn: string;
    messageZh: string;
}, {
    channels: ("SMS" | "EMAIL")[];
    messageEn: string;
    messageZh: string;
    audience?: "rsvped" | "all" | undefined;
}>;
export type BlastDto = z.infer<typeof BlastSchema>;
export declare const UpdateProfileSchema: z.ZodObject<{
    phone: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    email: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    preferredLanguage: z.ZodOptional<z.ZodEnum<["en", "zh"]>>;
    muteSms: z.ZodOptional<z.ZodBoolean>;
    muteEmail: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    password?: string | undefined;
    phone?: string | undefined;
    displayName?: string | undefined;
    preferredLanguage?: "en" | "zh" | undefined;
    muteSms?: boolean | undefined;
    muteEmail?: boolean | undefined;
}, {
    email?: string | undefined;
    password?: string | undefined;
    phone?: string | undefined;
    displayName?: string | undefined;
    preferredLanguage?: "en" | "zh" | undefined;
    muteSms?: boolean | undefined;
    muteEmail?: boolean | undefined;
}>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
export declare const EventListQuerySchema: z.ZodObject<{
    scope: z.ZodDefault<z.ZodEnum<["future", "past"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    scope: "future" | "past";
    page: number;
    pageSize: number;
}, {
    scope?: "future" | "past" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type EventListQuery = z.infer<typeof EventListQuerySchema>;
export declare const CommentListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type CommentListQuery = z.infer<typeof CommentListQuerySchema>;
//# sourceMappingURL=schemas.d.ts.map