// Core domain enums
export type Role = 'USER' | 'ADMIN';
export type RSVPStatus = 'GOING' | 'MAYBE' | 'NO';
export type MessageChannel = 'SMS' | 'EMAIL';
export type MessageStatus = 'PENDING' | 'SENT' | 'FAILED';
export type PreferredLanguage = 'en' | 'zh';
export type GroupMembershipRole = 'GROUP_ADMIN' | 'MEMBER';
export type GroupMembershipStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';
export type GroupInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
export type GroupJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phoneE164: string;
  preferredLanguage: PreferredLanguage;
  role: Role;
  notificationsMuted: boolean;
  createdAt: string; // ISO8601
}

/** Safe public projection (no passwordHash, no full phone) */
export interface PublicUser {
  id: string;
  preferredLanguage: PreferredLanguage;
  role: Role;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  createdById: string;
  groupId: string | null;
  groupName: string | null; // name of the group if this event was created from a group
  coverImageUrl: string | null;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  location_en: string;
  location_zh: string;
  startAt: string; // ISO8601
  endAt: string | null;
  timezone: string; // IANA tz, default 'Asia/Taipei'
  feeAmount: number | null;
  feeCurrency: string; // default 'TWD'
  createdAt: string;
  updatedAt: string;
}

export interface EventWithCounts extends Event {
  rsvpCounts: { GOING: number; MAYBE: number; NO: number };
  myRsvp: RSVPStatus | null; // populated when authenticated
}

// ─── News ────────────────────────────────────────────────────────────────────

export interface News {
  id: string;
  groupId: string | null;
  title_en: string;
  title_zh: string;
  body_en: string;
  body_zh: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// ─── RSVP ─────────────────────────────────────────────────────────────────────

export interface RSVP {
  id: string;
  eventId: string;
  userId: string;
  status: RSVPStatus;
  updatedAt: string;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  eventId: string;
  userId: string;
  /** Comment author display name, falling back to email */
  userHandle: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  replyToId?: string | null;
  replies?: Comment[];
}

// ─── ReminderRule ─────────────────────────────────────────────────────────────

export interface ReminderRule {
  id: string;
  eventId: string;
  offsetMinutes: number;
  channels: MessageChannel[];
  enabled: boolean;
}

// ─── MessageLog ───────────────────────────────────────────────────────────────

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

// ─── API response wrappers ────────────────────────────────────────────────────

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

// ─── Groups ──────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  pid: string;
  name: string;
  description: string;
  discoverableBySearch: boolean;
  memberDataPrivate: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMembership {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMembershipRole;
  status: GroupMembershipStatus;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  invitedUserId: string | null;
  email: string | null;
  phoneE164: string | null;
  token: string;
  expiresAt: string;
  status: GroupInviteStatus;
  respondedAt: string | null;
  createdAt: string;
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  requesterUserId: string;
  note: string;
  status: GroupJoinRequestStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  userHandle: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventInvite {
  id: string;
  eventId: string;
  token: string;
  expiresAt: string;
  createdById: string;
  createdAt: string;
}
