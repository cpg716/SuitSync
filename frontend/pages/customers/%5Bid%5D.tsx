import React from 'react';
import { useRouter } from 'next/router';

export default function CustomerDetailPage() {
  const isClient = typeof window !== 'undefined';
  const router = isClient ? useRouter() : null;
  return <div>Customer detail page placeholder.</div>;
} 