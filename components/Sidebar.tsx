'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore, Conversation } from '@/store/useChatStore';
import { Search, Plus, MessageSquare, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';

export function Sidebar() {
  const { user } = useAuthStore();
  const { selectedConversation, setSelectedConversation } = useChatStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      
      // Sort by last message timestamp
      convos.sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));
      setConversations(convos);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newChatEmail.trim()) return;
    setError('');
    
    if (newChatEmail.trim().toLowerCase() === user.email?.toLowerCase()) {
      setError("You cannot chat with yourself.");
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newChatEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('User not found.');
        return;
      }

      const targetUser = querySnapshot.docs[0].data();
      
      // Check if conversation already exists
      const existing = conversations.find(c => c.participants.includes(targetUser.uid));
      if (existing) {
        setSelectedConversation(existing);
        setShowNewChat(false);
        setNewChatEmail('');
        return;
      }

      const newConvoData = {
        participants: [user.uid, targetUser.uid],
        participantDetails: {
          [user.uid]: {
            displayName: user.displayName || user.email?.split('@')[0] || 'Unknown',
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`,
          },
          [targetUser.uid]: {
            displayName: targetUser.displayName || targetUser.email?.split('@')[0] || 'Unknown',
            photoURL: targetUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${targetUser.email}`,
          }
        },
        createdAt: serverTimestamp(),
        lastMessageTimestamp: Date.now()
      };

      const docRef = await addDoc(collection(db, 'conversations'), newConvoData);
      
      setSelectedConversation({
        id: docRef.id,
        ...newConvoData,
        lastMessageTimestamp: Date.now()
      });
      
      setShowNewChat(false);
      setNewChatEmail('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const otherUserId = c.participants.find(p => p !== user?.uid);
    if (!otherUserId) return false;
    const details = c.participantDetails?.[otherUserId];
    return details?.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full h-full bg-brand-panel flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-brand-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white line-clamp-1">{user?.displayName || user?.email?.split('@')[0]}</span>
            <span className="text-[10px] text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              Online
            </span>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="p-4">
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500"
          />
        </div>

        <button 
          onClick={() => setShowNewChat(!showNewChat)}
          className="w-full bg-white/5 hover:bg-white/10 text-slate-300 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors mb-2 border border-white/5"
        >
          <Plus size={16} />
          New Chat
        </button>

        {showNewChat && (
          <form onSubmit={handleCreateChat} className="bg-brand-surface border border-brand-border p-3 rounded-xl mb-4">
            <input 
              type="email" 
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              placeholder="Enter user email..."
              required
              className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg mb-2 bg-brand-bg text-white outline-none focus:border-indigo-500 placeholder-slate-500"
            />
            {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded-lg transition-colors">
              Start Conversation
            </button>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No conversations found.</p>
          </div>
        ) : (
          filteredConversations.map((convo) => {
            const otherUserId = convo.participants.find(p => p !== user?.uid)!;
            const details = convo.participantDetails?.[otherUserId];
            const isSelected = selectedConversation?.id === convo.id;
            
            return (
              <div 
                key={convo.id}
                onClick={() => setSelectedConversation(convo)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-l-2 ${
                  isSelected ? 'bg-indigo-500/10 border-indigo-500' : 'border-transparent hover:bg-white/5'
                }`}
              >
                <img 
                  src={details?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUserId}`} 
                  alt="User" 
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className={`text-sm truncate ${isSelected ? 'font-semibold text-white' : 'font-medium text-slate-300'}`}>
                      {details?.displayName || 'Unknown'}
                    </h3>
                  </div>
                  <p className={`text-xs truncate ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    {convo.lastMessage || 'Started a conversation'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
