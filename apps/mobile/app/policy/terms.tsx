import { ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TermsOfUseScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← {zh ? '返回' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{zh ? '使用條款' : 'Terms of Use'}</Text>
      <Text style={styles.date}>{zh ? '生效日期：2026 年 5 月 24 日' : 'Effective date: May 24, 2026'}</Text>

      <Text style={styles.body}>
        {zh
          ? `歡迎使用 Judien。使用本服務即表示您同意以下條款。\n\n1. 服務說明\nJudien 是一個活動與社群管理平台，供台灣社群組織活動與聯繫成員使用。\n\n2. 帳號\n您必須提供準確的帳號資訊並保管好密碼。您對帳號下的所有活動負責。\n\n3. 內容\n請勿發布違法、誹謗、侵權或有害內容。我們保留刪除違規內容的權利。\n\n4. 隱私\n我們根據隱私政策收集和使用您的資料。\n\n5. 服務變更\n我們保留隨時修改或終止服務的權利，不另行通知。\n\n6. 免責聲明\n本服務按「現狀」提供，不提供任何明示或暗示的保證。\n\n7. 聯絡我們\n如有疑問請聯絡：support@judien.tw`
          : `Welcome to Judien. By using this service you agree to these terms.\n\n1. Description\nJudien is an event and community management platform for community organizations in Taiwan.\n\n2. Accounts\nYou must provide accurate information and keep your password secure. You are responsible for all activity under your account.\n\n3. Content\nDo not post illegal, defamatory, infringing, or harmful content. We reserve the right to remove violating content.\n\n4. Privacy\nWe collect and use your data as described in our Privacy Policy.\n\n5. Changes\nWe reserve the right to modify or discontinue the service at any time without notice.\n\n6. Disclaimer\nThe service is provided "as is" without warranties of any kind.\n\n7. Contact\nFor questions contact: support@judien.tw`}
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
