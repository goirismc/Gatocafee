// app/page.js
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('gatocafee_token');
    router.replace(token ? '/dashboard' : '/login');
  }, []);
  return null;
}
