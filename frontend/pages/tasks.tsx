import { useEffect } from 'react';
import { useRouter } from 'next/router';

// /tasks is unified with /checklists workspace
export default function TasksRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/checklists');
  }, [router]);
  return null;
} 