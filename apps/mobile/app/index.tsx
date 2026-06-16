import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/auth.context';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (user) return <Redirect href="/(tabs)/home" />;
  return <Redirect href="/(auth)/login" />;
}
