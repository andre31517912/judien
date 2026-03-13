import { Redirect } from 'expo-router';

// This screen exists only to give the "+" tab its route.
// It immediately redirects to the real create-event screen.
export default function CreateTab() {
  return <Redirect href="/admin/events/new" />;
}
