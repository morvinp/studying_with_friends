import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketToken } from '../lib/api';
import useAuthUser from '../hooks/useAuthUser';

const SocketContext = createContext();

export const useGlobalSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useGlobalSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState(new Set());
  const { authUser } = useAuthUser();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const connectionRef = useRef(null);

  useEffect(() => {
    if (!authUser) {
      console.log('🚫 No authUser, skipping socket connection');
      return;
    }

    // Prevent multiple connections
    if (connectionRef.current) {
      console.log('♻️ Socket already exists, reusing connection');
      return;
    }

    const initSocket = async () => {
      try {
        console.log('🚀 Initializing global socket connection');
        
        const tokenData = await getSocketToken();
        if (!tokenData?.token) {
          console.log('❌ Failed to get socket token');
          return;
        }

        const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        const newSocket = io(socketUrl, {
          auth: { token: tokenData.token },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true // Force new connection
        });

        const handleConnect = () => {
          console.log('✅ Global socket connected');
          setIsConnected(true);
          setJoinedRooms(new Set()); // Clear joined rooms on reconnect
          reconnectAttempts.current = 0;
        };

        const handleDisconnect = (reason) => {
          console.log('❌ Global socket disconnected:', reason);
          setIsConnected(false);
          setJoinedRooms(new Set()); // Clear joined rooms on disconnect
          if (reason === 'io client disconnect') {
            connectionRef.current = null;
          }
        };

        const handleConnectError = (error) => {
          console.error('❌ Global socket connection error:', error);
          setIsConnected(false);
          
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setTimeout(() => {
              console.log(`🔄 Reconnecting... (attempt ${reconnectAttempts.current})`);
              newSocket.connect();
            }, 2000 * reconnectAttempts.current);
          }
        };

        newSocket.on('connect', handleConnect);
        newSocket.on('disconnect', handleDisconnect);
        newSocket.on('connect_error', handleConnectError);

        connectionRef.current = newSocket;
        setSocket(newSocket);

      } catch (error) {
        console.error('❌ Error initializing global socket:', error);
      }
    };

    initSocket();

    return () => {
      if (connectionRef.current) {
        console.log('🧹 Cleaning up global socket');
        connectionRef.current.disconnect();
        connectionRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setJoinedRooms(new Set());
      }
    };
  }, [authUser]);

  // Socket management functions
  const joinRoom = (roomId, roomType = 'chat') => {
    if (socket && !joinedRooms.has(roomId)) {
      console.log(`🚪 Joining room: ${roomId} (${roomType})`);
      socket.emit('join_chat', { chatId: roomId, chatType: roomType });
      setJoinedRooms(prev => new Set([...prev, roomId]));
    } else if (joinedRooms.has(roomId)) {
      console.log(`⚠️ Already joined room: ${roomId}`);
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && joinedRooms.has(roomId)) {
      console.log(`🚪 Leaving room: ${roomId}`);
      socket.emit('leave_chat', { chatId: roomId });
      setJoinedRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  const sendMessage = (roomId, message, messageType = 'direct') => {
    if (socket) {
      socket.emit('send_message', {
        chatId: roomId,
        message,
        chatType: messageType
      });
    }
  };

  const sendCallChatMessage = (message) => {
    if (socket) {
      socket.emit('send_call_chat_message', message);
    }
  };

  const startTyping = (roomId) => {
    if (socket) {
      socket.emit('typing_start', { chatId: roomId });
    }
  };

  const stopTyping = (roomId) => {
    if (socket) {
      socket.emit('typing_stop', { chatId: roomId });
    }
  };

  const startCallChatTyping = (callId, userId, username) => {
    if (socket) {
      socket.emit('call_chat_typing', { callId, userId, username });
    }
  };

  const stopCallChatTyping = (callId, userId) => {
    if (socket) {
      socket.emit('call_chat_stop_typing', { callId, userId });
    }
  };

  const emitCallEvent = (eventName, data) => {
    if (socket) {
      socket.emit(eventName, data);
    }
  };

  const value = {
    socket,
    isConnected,
    joinedRooms,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendCallChatMessage,
    startTyping,
    stopTyping,
    startCallChatTyping,
    stopCallChatTyping,
    emitCallEvent
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
