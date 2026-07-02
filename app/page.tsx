'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';

export default function Home() {
  const { user, loading } = useAuthStore();
  const { selectedConversation } = useChatStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-brand-bg text-white">
      <div className={`w-full md:w-[320px] h-full flex-shrink-0 border-r border-brand-border ${selectedConversation ? 'hidden md:flex flex-col' : 'flex flex-col'}`}>
        <Sidebar />
      </div>
      <div className={`flex-1 flex flex-col h-full bg-brand-surface ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <ChatArea />
      </div>
    </div>
  );
}
