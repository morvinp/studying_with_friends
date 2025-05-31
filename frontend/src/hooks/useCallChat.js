import { useState, useEffect, useRef } from 'react';
import { useGlobalSocket } from '../context/SocketContext';

const useCallChat = (authUser, callId) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState([]);
  
  const { 
    socket, 
    sendCallChatMessage, 
    startCallChatTyping, 
    stopCallChatTyping 
  } = useGlobalSocket();
  
  const typingTimeoutRef = useRef(null);
  const hasJoinedRef = useRef(false); // Prevent duplicate joins
  
  // Fix callId - ensure it's a string
  const chatRoomId = `call-${String(callId)}`;

  useEffect(() => {
    if (!socket || !callId || !authUser || hasJoinedRef.current) return;

    console.log('Setting up call chat for room:', chatRoomId);

    // Mark as joined to prevent duplicates
    hasJoinedRef.current = true;

    // Join call chat room
    socket.emit('join_call_chat', {
      callId: chatRoomId,
      userId: authUser._id,
      username: authUser.fullName
    });

    const handleCallChatMessage = (message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    const handleCallChatTyping = ({ userId, username }) => {
      if (userId !== authUser._id) {
        setTyping(prev => {
          if (!prev.find(user => user.userId === userId)) {
            return [...prev, { userId, username }];
          }
          return prev;
        });
      }
    };

    const handleCallChatStopTyping = ({ userId }) => {
      setTyping(prev => prev.filter(user => user.userId !== userId));
    };

    socket.on('call_chat_message', handleCallChatMessage);
    socket.on('call_chat_typing', handleCallChatTyping);
    socket.on('call_chat_stop_typing', handleCallChatStopTyping);

    return () => {
      hasJoinedRef.current = false;
      socket.emit('leave_call_chat', { callId: chatRoomId });
      socket.off('call_chat_message', handleCallChatMessage);
      socket.off('call_chat_typing', handleCallChatTyping);
      socket.off('call_chat_stop_typing', handleCallChatStopTyping);
    };
  }, [socket, callId, authUser, chatRoomId]);

  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now() + Math.random(),
      text: newMessage.trim(),
      user: {
        _id: authUser._id,
        name: authUser.fullName,
        image: authUser.profilePic
      },
      timestamp: new Date().toISOString(),
      callId: chatRoomId
    };

    sendCallChatMessage(message);
    setNewMessage('');
    stopCallChatTyping(chatRoomId, authUser._id);
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    startCallChatTyping(chatRoomId, authUser._id, authUser.fullName);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopCallChatTyping(chatRoomId, authUser._id);
    }, 2000);
  };

  return {
    messages,
    newMessage,
    typing,
    sendMessage,
    handleTyping
  };
};

export default useCallChat;
