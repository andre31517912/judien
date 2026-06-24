import { redirect } from 'next/navigation';

export default function AdminGroupPage({ params }: { params: { locale: string; groupId: string } }) {
  redirect(`/${params.locale}/groups/${params.groupId}`);
}
