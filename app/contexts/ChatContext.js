// context/ChatContext.js
'use client';
import { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [isChatOpen, setChatOpen] = useState(false);
  const [page, setPage] = useState('home'); 

  const openChat = () => setChatOpen(true);
  const closeChat = () => setChatOpen(false);
  const goToForm = () => setPage('form');
  const goToHome = () => setPage('home');

  return (
    <ChatContext.Provider value={{ isChatOpen, openChat, closeChat, page, goToForm, goToHome }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
