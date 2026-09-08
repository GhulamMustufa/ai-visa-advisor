"use client";

import { useChat } from '@ai-sdk/react';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import Markdown from 'react-markdown';

export default function ChatPage() {
  const chatHelpers = useChat();
  const { messages, setMessages, status, sendMessage } = chatHelpers;
  const isLoading = status === 'submitted' || status === 'streaming';
  const { isSignedIn, isLoaded } = useAuth();
  const [messageCount, setMessageCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isChatLoaded, setIsChatLoaded] = useState(false);

  // Load free message usage limit
  useEffect(() => {
    if (!isSignedIn && isLoaded) {
      const used = localStorage.getItem('freeMessagesUsed');
      if (used) {
        setMessageCount(parseInt(used, 10));
      }
    }
  }, [isSignedIn, isLoaded]);

  // Load chat history from localStorage
  useEffect(() => {
    const savedChat = localStorage.getItem('chatHistory');
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    setIsChatLoaded(true);
  }, [setMessages]);

  // Save chat history to localStorage
  useEffect(() => {
    if (isChatLoaded) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages, isChatLoaded]);

  const handleFormSubmit = async (e?: React.FormEvent, customValue?: string) => {
    if (e) e.preventDefault();
    const content = customValue || inputValue;
    if (!content.trim()) return;
    
    setInputValue("");
    
    try {
      await sendMessage({ text: content });
      
      // Update message count for free tier
      if (!isSignedIn && isLoaded) {
        const newCount = messageCount + 1;
        setMessageCount(newCount);
        localStorage.setItem('freeMessagesUsed', newCount.toString());
      }
    } catch (err) {
      console.error("Failed to append message:", err);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track free messages for unauthenticated users
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user').length;
    setMessageCount(userMessages);
  }, [messages]);

  // Show paywall/authwall if limit is reached and not signed in
  const isLimitReached = isLoaded && !isSignedIn && messageCount >= 3;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-[#0a0a0a] font-sans">
      
      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto space-y-8 pb-32">
        
        {isChatLoaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg rotate-3">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">AI Visa Consultant</h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                Ask me anything about moving abroad. I am strictly bound to official immigration rules from over 70 countries.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-8">
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-left text-sm text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer hover:border-indigo-500 transition-colors" onClick={() => {
                 handleFormSubmit(undefined, "What are the requirements for Spain's Digital Nomad Visa?");
               }}>
                 "What are the requirements for Spain's Digital Nomad Visa?"
               </div>
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-left text-sm text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer hover:border-indigo-500 transition-colors" onClick={() => {
                 handleFormSubmit(undefined, "Do I need a job offer for the Canadian Express Entry?");
               }}>
                 "Do I need a job offer for the Canadian Express Entry?"
               </div>
            </div>
          </div>
        )}
        
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </div>
            )}
            
            <div className={`max-w-[85%] sm:max-w-[80%] px-5 py-4 shadow-sm ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm' 
                : 'bg-white dark:bg-[#111] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm'
            }`}>
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                <Markdown>
                  {m.content || 
                   (m.parts && m.parts.map(p => (p as any).type === 'text' ? (p as any).text : '').join('')) || 
                   ""}
                </Markdown>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
             <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </div>
            <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-slate-800 w-full z-10 relative">
        <div className="max-w-4xl mx-auto">
          {isLimitReached ? (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-6 text-center animate-in slide-in-from-bottom-4">
              <h3 className="text-indigo-900 dark:text-indigo-200 font-semibold mb-2">Free Consultation Complete</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300/80 mb-5">
                You've used your 3 free messages. Please sign in to save your history and continue chatting with the AI Advisor.
              </p>
              <SignInButton mode="modal">
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-all shadow-sm hover:shadow-md">
                  Sign In to Continue
                </button>
              </SignInButton>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="relative flex items-center shadow-sm rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
              <input
                className="w-full bg-transparent border-none py-4 pl-6 pr-14 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
                value={inputValue}
                placeholder={
                  !isSignedIn && isLoaded
                    ? `Ask a visa question... (${3 - messageCount} free messages left)` 
                    : "Ask about a visa, e.g., 'What are the rules for Spain's digital nomad visa?'"
                }
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 ml-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </button>
            </form>
          )}
          <div className="text-center mt-3 text-xs text-slate-500 dark:text-slate-500">
            AI Advisor relies on official government data, but always verify with official sources before applying.
          </div>
        </div>
      </div>
    </div>
  );
}
