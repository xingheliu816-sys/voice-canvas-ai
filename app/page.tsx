import { getCurrentUser } from '@/lib/auth/server-helpers';
import { redirect } from 'next/navigation';
import CanvasStageWrapper from './CanvasStageWrapper';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <CanvasStageWrapper />;
}
