export type Role = 'USER' | 'ADMIN';
export type RSVPStatus = 'GOING' | 'MAYBE' | 'NO';
export type MessageChannel = 'SMS' | 'EMAIL';
export type MessageStatus = 'PENDING' | 'SENT' | 'FAILED';
export type PreferredLanguage = 'en' | 'zh';
export interface User {
    id: string;
    email: string;
    phoneE164: string;
    preferredLanguage: PreferredLanguage;
    role: Role;
    notificationsMuted: boolean;
    createdAt: string;
}
/** Safe public projection (no passwordHash, no full phone) */
export interface PublicUser {
    id: string;
    preferredLanguage: PreferredLanguage;
    role: Role;
}
export interface Event {
    id: string;
    createdById: string;
    coverImageUrl: string | null;
    title_en: string;
    title_zh: string;
    description_en: string;
    description_zh: string;
    location_en: string;
    location_zh: string;
    startAt: string;
    endAt: string | null;
    timezone: string;
    feeAmount: number | null;
    feeCurrency: string;
    createdAt: string;
    updatedAt: string;
}
export interface EventWithCounts extends Event {
    rsvpCounts: {
        GOING: number;
        MAYBE: number;
        NO: number;
    };
    myRsvp: RSVPStatus | null;
}
export interface RSVP {
    id: string;
    eventId: string;
    userId: string;
    status: RSVPStatus;
    updatedAt: string;
}
export interface Comment {
    id: string;
    eventId: string;
    userId: string;
    /** Redacted email prefix for display, e.g. "den***" */
    userHandle: string;
    body: string;
    createdAt: string;
    deletedAt: string | null;
}
export interface ReminderRule {
    id: string;
    eventId: string;
    offsetMinutes: number;
    channels: MessageChannel[];
    enabled: boolean;
}
export interface MessageLog {
    id: string;
    eventId: string | null;
    userId: string;
    channel: MessageChannel;
    toAddress: string;
    payload: Record<string, unknown>;
    status: MessageStatus;
    providerMessageId: string | null;
    createdAt: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}
export interface ApiError {
    statusCode: number;
    message: string;
    errors?: Record<string, string[]>;
}
//# sourceMappingURL=types.d.ts.map