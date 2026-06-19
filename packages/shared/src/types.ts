// Core domain enums
export type Role = 'USER' | 'ADMIN';
export type RSVPStatus = 'GOING' | 'NO';
export type MessageChannel = 'EMAIL' | 'LINE';
export type MessageStatus = 'PENDING' | 'SENT' | 'FAILED';
export type PreferredLanguage = 'en' | 'zh';
export type GroupMembershipRole = 'GROUP_ADMIN' | 'GROUP_MEMBER';
export type GroupMembershipStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';
export type GroupInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
export type GroupJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  phoneE164: string | null;
  lineUserId: string | null;
  displayName: string | null;
  preferredLanguage: PreferredLanguage;
  colorTheme: 'light' | 'dark';
  role: Role;
  isGuest: boolean;
  hasPassword: boolean;
  notificationsMuted: boolean;
  muteLinePush: boolean;
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
  groupName: string | null;
  seriesId: string | null;
  partNumber: number | null;
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
  commentsEnabled: boolean;
  messagingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventWithCounts extends Event {
  rsvpCounts: { GOING: number; NO: number };
  myRsvp: RSVPStatus | null; // populated when authenticated
  shareToken?: string | null;
  isPast?: boolean;
}

// ─── News ────────────────────────────────────────────────────────────────────

export interface News {
  id: string;
  groupId: string | null;
  group?: { name: string } | null;
  title_en: string;
  title_zh: string;
  body_en: string;
  body_zh: string;
  createdById: string;
  createdBy?: { id: string; displayName: string | null };
  createdAt: string;
  updatedAt: string;
  coverImageUrl?: string | null;
}

// ─── RSVP ─────────────────────────────────────────────────────────────────────

export interface RSVP {
  id: string;
  eventId: string;
  userId: string;
  status: RSVPStatus;
  updatedAt: string;
}

export interface GuestRSVP {
  id: string;
  eventId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: RSVPStatus;
  updatedAt: string;
}

export interface EventShareLink {
  id: string;
  eventId: string;
  token: string;
  createdById: string;
  createdAt: string;
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

// ─── InviteToken ──────────────────────────────────────────────────────────────

export interface InviteToken {
  id: string;
  token: string;
  role: Role;
  createdById: string;
  usedById: string | null;
  usedBy?: { id: string; displayName: string | null; email: string } | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
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
  photoUrl: string | null;
  discoverableBySearch: boolean;
  parentGroupId: string | null;
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
  acceptedByUserId: string | null;
  acceptedAt: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  createdAt: string;
}

export interface EventSeries {
  id: string;
  title_en: string;
  title_zh: string;
  groupId: string | null;
  createdById: string;
  createdAt: string;
  events?: EventWithCounts[];
}

export interface EventInvitee {
  inviteId: string;
  userId: string | null;
  displayName: string | null;
  email: string | null;
  guestName: string | null;
  acceptedAt: string | null;
}
