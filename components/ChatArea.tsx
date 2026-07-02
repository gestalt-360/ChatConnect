'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { Send, Paperclip, Mic, FileText, Play, Square, FileIcon, Download, Loader2, MessageSquare, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  timestamp: any;
  type: 'text' | 'audio' | 'pdf';
  text?: string;
  fileUrl?: string;
  fileName?: string;
}

export function ChatArea() {
  const { user } = useAuthStore();
  const { selectedConversation, setSelectedConversation } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedConversation) return;

    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', selectedConversation.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user || !selectedConversation) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await addDoc(collection(db, 'messages'), {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        type: 'text',
        text: text,
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: text,
        lastMessageTimestamp: Date.now()
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob: Blob) => {
    if (!user || !selectedConversation) return;
    setIsUploading(true);
    try {
      const fileName = `audio_${Date.now()}.webm`;
      const fileRef = ref(storage, `chats/${selectedConversation.id}/${fileName}`);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);

      await addDoc(collection(db, 'messages'), {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        type: 'audio',
        fileUrl: url,
        fileName: 'Audio Message',
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: '🎵 Audio message',
        lastMessageTimestamp: Date.now()
      });
    } catch (err) {
      console.error('Audio upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedConversation) return;
    
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const fileRef = ref(storage, `chats/${selectedConversation.id}/${fileName}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await addDoc(collection(db, 'messages'), {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        type: 'pdf',
        fileUrl: url,
        fileName: file.name,
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: '📄 PDF Document',
        lastMessageTimestamp: Date.now()
      });
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-brand-bg text-slate-400">
        <MessageSquare size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-medium text-slate-300">Select a conversation</h2>
        <p className="text-sm mt-2 text-center max-w-sm">
          Choose an existing conversation from the sidebar or start a new one to begin messaging.
        </p>
      </div>
    );
  }

  const otherUserId = selectedConversation.participants.find(p => p !== user?.uid)!;
  const otherUserDetails = selectedConversation.participantDetails?.[otherUserId];

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-surface">
      {/* Header */}
      <div className="h-[89px] border-b border-brand-border flex items-center justify-between px-8 bg-brand-panel/50 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedConversation(null)}
            className="md:hidden p-2 -ml-4 text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <img 
            src={otherUserDetails?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUserId}`} 
            alt="User" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h2 className="text-sm font-semibold text-white">{otherUserDetails?.displayName || 'Unknown'}</h2>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => {
          const isMine = msg.senderId === user?.uid;
          const msgTime = msg.timestamp?.toDate() ? format(msg.timestamp.toDate(), 'HH:mm') : '';
          const showName = !isMine && (i === 0 || messages[i-1].senderId !== msg.senderId);

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {showName && (
                <span className="text-xs text-slate-500 ml-1 mb-1">{otherUserDetails?.displayName}</span>
              )}
              <div 
                className={`max-w-[75%] md:max-w-[70%] p-4 text-xs leading-relaxed ${
                  isMine 
                    ? 'message-gradient rounded-2xl rounded-tr-none shadow-lg shadow-indigo-500/10 text-white' 
                    : 'bg-brand-panel border border-brand-border rounded-2xl rounded-tl-none text-white'
                }`}
              >
                {msg.type === 'text' && (
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                )}
                
                {msg.type === 'audio' && (
                  <div className="flex items-center gap-2">
                    <audio src={msg.fileUrl} controls className="h-10 w-[200px] outline-none" />
                  </div>
                )}

                {msg.type === 'pdf' && (
                  <div className="flex items-center gap-3 bg-brand-surface border border-brand-border p-3 rounded-xl">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center text-red-500">
                      <FileIcon size={20} />
                    </div>
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-xs font-medium truncate">{msg.fileName}</p>
                      <p className="text-[10px] text-slate-500">PDF Document</p>
                    </div>
                    <a 
                      href={msg.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
                      title="Download"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                )}
                
                <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {msgTime}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <footer className="p-6 bg-brand-panel/50 border-t border-brand-border">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-brand-surface border border-brand-border rounded-2xl px-4 py-2 ring-1 ring-white/5 mx-auto w-full">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="application/pdf"
            className="hidden" 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isRecording}
            className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
            title="Attach PDF"
          >
            <Paperclip size={20} />
          </button>
          
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? "Recording audio..." : isUploading ? "Uploading..." : "Type a message..."}
            disabled={isRecording || isUploading}
            className="flex-1 bg-transparent border-none py-3 text-xs focus:outline-none focus:ring-0 placeholder-slate-600 text-white disabled:opacity-50"
          />

          <div className="flex items-center gap-1">
            <button 
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              disabled={isUploading}
              className={`p-2 transition-colors flex-shrink-0 ${
                isRecording 
                  ? 'text-red-400 animate-pulse' 
                  : 'text-slate-400 hover:text-white'
              } disabled:opacity-50`}
              title="Hold to record audio"
            >
              {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
            </button>
            <button 
              type="submit"
              disabled={!inputText.trim() || isUploading || isRecording}
              className="ml-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex-shrink-0 text-white"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}
