
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  phoneE164: 'phoneE164',
  displayName: 'displayName',
  preferredLanguage: 'preferredLanguage',
  colorTheme: 'colorTheme',
  role: 'role',
  muteEmail: 'muteEmail',
  muteLinePush: 'muteLinePush',
  lineUserId: 'lineUserId',
  isGuest: 'isGuest',
  hasPassword: 'hasPassword',
  createdAt: 'createdAt'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  createdById: 'createdById',
  groupId: 'groupId',
  seriesId: 'seriesId',
  partNumber: 'partNumber',
  coverImageUrl: 'coverImageUrl',
  title_en: 'title_en',
  title_zh: 'title_zh',
  description_en: 'description_en',
  description_zh: 'description_zh',
  location_en: 'location_en',
  location_zh: 'location_zh',
  startAt: 'startAt',
  endAt: 'endAt',
  timezone: 'timezone',
  feeAmount: 'feeAmount',
  feeCurrency: 'feeCurrency',
  commentsEnabled: 'commentsEnabled',
  messagingEnabled: 'messagingEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventShareLinkScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  token: 'token',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.GuestRSVPScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  guestName: 'guestName',
  guestEmail: 'guestEmail',
  guestPhone: 'guestPhone',
  identityHash: 'identityHash',
  status: 'status',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventSeriesScalarFieldEnum = {
  id: 'id',
  title_en: 'title_en',
  title_zh: 'title_zh',
  groupId: 'groupId',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.EventInviteScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  token: 'token',
  expiresAt: 'expiresAt',
  createdById: 'createdById',
  acceptedByUserId: 'acceptedByUserId',
  acceptedAt: 'acceptedAt',
  guestName: 'guestName',
  guestEmail: 'guestEmail',
  guestPhone: 'guestPhone',
  createdAt: 'createdAt'
};

exports.Prisma.RSVPScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  userId: 'userId',
  status: 'status',
  declineReason: 'declineReason',
  updatedAt: 'updatedAt'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  userId: 'userId',
  body: 'body',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt',
  replyToId: 'replyToId'
};

exports.Prisma.GroupMessageScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  userId: 'userId',
  body: 'body',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReminderRuleScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  offsetMinutes: 'offsetMinutes',
  channels: 'channels',
  enabled: 'enabled'
};

exports.Prisma.MessageLogScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  userId: 'userId',
  channel: 'channel',
  toAddress: 'toAddress',
  payload: 'payload',
  status: 'status',
  providerMessageId: 'providerMessageId',
  createdAt: 'createdAt'
};

exports.Prisma.NewsScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  title_en: 'title_en',
  title_zh: 'title_zh',
  body_en: 'body_en',
  body_zh: 'body_zh',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GroupScalarFieldEnum = {
  id: 'id',
  pid: 'pid',
  name: 'name',
  description: 'description',
  photoUrl: 'photoUrl',
  discoverableBySearch: 'discoverableBySearch',
  parentGroupId: 'parentGroupId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GroupMembershipScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  userId: 'userId',
  role: 'role',
  status: 'status',
  invitedByPlatformAdminId: 'invitedByPlatformAdminId',
  groupNickname: 'groupNickname',
  joinedAt: 'joinedAt',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GroupInviteScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  invitedByPlatformAdminId: 'invitedByPlatformAdminId',
  invitedUserId: 'invitedUserId',
  email: 'email',
  phoneE164: 'phoneE164',
  token: 'token',
  expiresAt: 'expiresAt',
  status: 'status',
  respondedAt: 'respondedAt',
  createdAt: 'createdAt'
};

exports.Prisma.GroupJoinRequestScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  requesterUserId: 'requesterUserId',
  note: 'note',
  status: 'status',
  reviewedByUserId: 'reviewedByUserId',
  reviewedAt: 'reviewedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GroupRelationshipRequestScalarFieldEnum = {
  id: 'id',
  sourceGroupId: 'sourceGroupId',
  targetGroupId: 'targetGroupId',
  requesterUserId: 'requesterUserId',
  status: 'status',
  reviewedByUserId: 'reviewedByUserId',
  reviewedAt: 'reviewedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DonationRecordScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  forUserId: 'forUserId',
  amount: 'amount',
  currency: 'currency',
  date: 'date',
  note: 'note',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.InviteTokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  role: 'role',
  createdById: 'createdById',
  usedById: 'usedById',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title_en: 'title_en',
  title_zh: 'title_zh',
  body_en: 'body_en',
  body_zh: 'body_zh',
  read: 'read',
  actionUrl: 'actionUrl',
  groupId: 'groupId',
  eventId: 'eventId',
  requestId: 'requestId',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Role = exports.$Enums.Role = {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

exports.RSVPStatus = exports.$Enums.RSVPStatus = {
  GOING: 'GOING',
  NO: 'NO'
};

exports.MessageChannel = exports.$Enums.MessageChannel = {
  EMAIL: 'EMAIL',
  LINE: 'LINE'
};

exports.MessageStatus = exports.$Enums.MessageStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED'
};

exports.GroupMembershipRole = exports.$Enums.GroupMembershipRole = {
  GROUP_ADMIN: 'GROUP_ADMIN',
  GROUP_MEMBER: 'GROUP_MEMBER'
};

exports.GroupMembershipStatus = exports.$Enums.GroupMembershipStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  REMOVED: 'REMOVED'
};

exports.GroupInviteStatus = exports.$Enums.GroupInviteStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

exports.GroupJoinRequestStatus = exports.$Enums.GroupJoinRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  JOIN_REQUEST_RECEIVED: 'JOIN_REQUEST_RECEIVED',
  JOIN_REQUEST_APPROVED: 'JOIN_REQUEST_APPROVED',
  JOIN_REQUEST_REJECTED: 'JOIN_REQUEST_REJECTED',
  EVENT_REMINDER: 'EVENT_REMINDER',
  EVENT_INVITE: 'EVENT_INVITE',
  GROUP_INVITE_RECEIVED: 'GROUP_INVITE_RECEIVED',
  NEWS_PUBLISHED: 'NEWS_PUBLISHED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Event: 'Event',
  EventShareLink: 'EventShareLink',
  GuestRSVP: 'GuestRSVP',
  EventSeries: 'EventSeries',
  EventInvite: 'EventInvite',
  RSVP: 'RSVP',
  Comment: 'Comment',
  GroupMessage: 'GroupMessage',
  ReminderRule: 'ReminderRule',
  MessageLog: 'MessageLog',
  News: 'News',
  Group: 'Group',
  GroupMembership: 'GroupMembership',
  GroupInvite: 'GroupInvite',
  GroupJoinRequest: 'GroupJoinRequest',
  GroupRelationshipRequest: 'GroupRelationshipRequest',
  DonationRecord: 'DonationRecord',
  InviteToken: 'InviteToken',
  Notification: 'Notification'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
