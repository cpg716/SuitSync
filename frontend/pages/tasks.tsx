import { useEffect } from 'react';
import { useRouter } from 'next/router';

// /tasks is unified with /checklists workspace
export default function TasksRedirect() {
  const isClient = typeof window !== 'undefined';
  const router = isClient ? useRouter() : null;
  useEffect(() => {
    router.replace('/checklists');
  }, [router]);
  return null;
} 