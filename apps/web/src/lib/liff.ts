/**
 * LIFF (LINE Front-end Framework) integration placeholder.
 *
 * LIFF lets this Next.js web app run inside LINE as a mini-app.
 * Users can open it directly from a LINE message/QR code without
 * downloading the Expo app — and are already authenticated via their
 * LINE account.
 *
 * To activate LIFF:
 *   1. Create a LINE Login channel at https://developers.line.biz
 *   2. Add a LIFF app pointing to your Vercel deployment URL
 *   3. Install the LIFF SDK:  pnpm add @line/liff  (in apps/web)
 *   4. Call liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID }) in the
 *      root layout's useEffect (client side only).
 *   5. Use liff.getProfile() to get the LINE user's name/photo/userId
 *      and pass it to your existing LINE OAuth flow (/auth/line/callback).
 *   6. Set NEXT_PUBLIC_LIFF_ID in Vercel environment variables.
 *
 * Useful LIFF APIs once initialized:
 *   liff.isInClient()         — true when running inside LINE app
 *   liff.isLoggedIn()         — true when user is authenticated via LINE
 *   liff.getProfile()         — { userId, displayName, pictureUrl }
 *   liff.getAccessToken()     — LINE access token (send to your API to verify)
 *   liff.closeWindow()        — close the LIFF webview
 *   liff.shareTargetPicker()  — let user share content to LINE chats
 *
 * Environment variables needed:
 *   NEXT_PUBLIC_LIFF_ID=123456789-xxxxxxxx
 */

// TODO: implement when ready to integrate into LINE ecosystem
export {};
