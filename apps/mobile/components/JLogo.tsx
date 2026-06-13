import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/theme.context';

export default function JLogo() {
  const { isDark } = useTheme();
  return <Text style={[styles.wordmark, { color: isDark ? '#FFFFFF' : '#4F46E5' }]}>Judien</Text>;
}

const styles = StyleSheet.create({
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
