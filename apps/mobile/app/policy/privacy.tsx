import { ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← {zh ? '返回' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{zh ? '隱私政策' : 'Privacy Policy'}</Text>
      <Text style={styles.date}>{zh ? '生效日期：2026 年 5 月 24 日' : 'Effective date: May 24, 2026'}</Text>

      <Text style={styles.body}>
        {zh
          ? `Judien（以下簡稱「我們」）經營 judien.com 及相關服務。本隱私政策說明我們在您使用 Judien 時如何收集、使用和保護您的資訊。\n\n1. 我們收集的資訊\n• 帳號資訊：顯示名稱、電子郵件、電話號碼及密碼（加密儲存）。\n• 個人活動：您建立或回覆的活動、加入的群組、發送的訊息及捐款記錄。\n• 連結帳號：如您連結 LINE，我們會儲存您的 LINE 用戶 ID 以發送推播通知。\n• 使用資料：裝置類型、瀏覽器、造訪頁面及時間戳記。\n• 上傳內容：您為活動或群組上傳的照片。\n\n2. 資訊使用方式\n• 營運並改善 Judien 平台。\n• 透過電子郵件或 LINE 發送活動提醒、邀請和通知。\n• 允許群組管理員管理成員。\n• 回覆支援請求。\n• 遵守法律義務。\n\n我們不會將您的個人資訊出售給第三方。\n\n3. 資訊分享\n• 群組管理員可查看您在群組內的顯示名稱、電子郵件、電話及角色。\n• 服務提供商：Resend（電子郵件）、Render/Vercel（雲端託管）及 LINE 訊息服務。\n\n4. 資料安全\n我們採用業界標準措施保護您的資料，但無法保證絕對安全。\n\n5. 您的權利\n您可以隨時更新或刪除帳號資訊。如需刪除帳號，請聯絡 support@judien.tw。\n\n6. 聯絡我們\nsupport@judien.tw`
          : `Judien ("we", "us") operates judien.com and related services. This Privacy Policy explains how we collect, use, and protect your information.\n\n1. Information We Collect\n• Account info: display name, email, phone number, and password (hashed).\n• Profile activity: events you create or RSVP to, groups you join, messages you send, and donations you record.\n• Connected accounts: if you link LINE, we store your LINE User ID to send push notifications.\n• Usage data: device type, browser, pages visited, and timestamps.\n• Uploaded content: photos you upload for events or groups.\n\n2. How We Use Your Information\n• Operate and improve the Judien platform.\n• Send event reminders, invitations, and notifications via email or LINE.\n• Allow group admins to manage their members.\n• Respond to support requests.\n• Comply with legal obligations.\n\nWe do not sell your personal information to third parties.\n\n3. Sharing Your Information\n• Group admins can see your display name, email, phone, and role within their group.\n• Service providers: Resend (email), Render/Vercel (cloud hosting), and LINE messaging — only as needed.\n\n4. Data Security\nWe use industry-standard measures to protect your data, but cannot guarantee absolute security.\n\n5. Your Rights\nYou may update or delete your account information at any time. To delete your account contact support@judien.tw.\n\n6. Contact\nsupport@judien.tw`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  back: { marginBottom: 16 },
  backText: { color: '#4F46E5', fontSize: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  date: { fontSize: 12, color: '#9CA3AF', marginBottom: 20 },
  body: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
