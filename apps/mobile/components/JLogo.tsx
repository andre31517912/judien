import { Text, StyleSheet } from 'react-native';

export default function JLogo() {
  return <Text style={styles.wordmark}>Judien</Text>;
}

const styles = StyleSheet.create({
  wordmark: {
    color: '#4F46E5',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
