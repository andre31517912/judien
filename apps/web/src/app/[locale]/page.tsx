import { redirect } from 'next/navigation';

export default function LocalePage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/events`);
}
