-- Apple App Store reviewer account (platform ADMIN)
-- Email: apple.reviewer@judien.app
-- Password: Judien2026!AppleRvw#
INSERT INTO "User" (
  "id",
  "email",
  "passwordHash",
  "displayName",
  "preferredLanguage",
  "colorTheme",
  "role",
  "muteEmail",
  "muteLinePush",
  "muteInAppNotifications",
  "isGuest",
  "hasPassword",
  "createdAt"
) VALUES (
  'apple-reviewer-account-judien',
  'apple.reviewer@judien.app',
  '$2a$12$KvG8csyDwn/rrV3pBExsGe1O4hO1Hp5bDTkKZqta0OZBlKROdIfBG',
  'Apple Reviewer',
  'en',
  'light',
  'ADMIN',
  false,
  false,
  false,
  false,
  true,
  NOW()
) ON CONFLICT ("email") DO NOTHING;
