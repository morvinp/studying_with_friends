import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketToken } from '../lib/api';

const useSocket = (authUser) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    console.log('useSocket: Starting connection process');
    console.log('authUser:', authUser);
    
    if (!authUser) {
      console.log('useSocket: No authUser, skipping connection');
      return;
    }

    const initSocket = async () => {
      try {
        // Get token from API instead of cookies
        const tokenData = await getSocketToken();
        
        if (!tokenData?.token) {
          console.log('useSocket: Failed to get socket token');
          return;
        }

        console.log('useSocket: Socket token obtained');

        const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        console.log('useSocket: Connecting to:', socketUrl);

        const newSocket = io(socketUrl, {
          auth: { token: tokenData.token },
          transports: ['websocket', 'polling'],
          timeout: 10000,
        });

        const handleConnect = () => {
          console.log('✅ Connected to server');
          setIsConnected(true);
          reconnectAttempts.current = 0;
        };

        const handleDisconnect = (reason) => {
          console.log('❌ Disconnected from server:', reason);
          setIsConnected(false);
        };

        const handleConnectError = (error) => {
          console.error('❌ Connection error:', error);
          setIsConnected(false);
          
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setTimeout(() => {
              console.log(`🔄 Reconnecting... (attempt ${reconnectAttempts.current})`);
              newSocket.connect();
            }, 2000 * reconnectAttempts.current);
          }
        };

        const handleReconnect = () => {
          console.log('🔄 Socket reconnected');
          setIsConnected(true);
        };

        // Set up event listeners
        newSocket.on('connect', handleConnect);
        newSocket.on('disconnect', handleDisconnect);
        newSocket.on('connect_error', handleConnectError);
        newSocket.on('reconnect', handleReconnect);

        setSocket(newSocket);

        // Return cleanup function for this specific socket
        return () => {
          console.log('🧹 Cleaning up socket connection');
          newSocket.off('connect', handleConnect);
          newSocket.off('disconnect', handleDisconnect);
          newSocket.off('connect_error', handleConnectError);
          newSocket.off('reconnect', handleReconnect);
          newSocket.disconnect();
        };

      } catch (error) {
        console.error('useSocket: Error initializing socket:', error);
      }
    };

    // Call initSocket and store cleanup function
    const cleanupPromise = initSocket();

    // Return cleanup function for useEffect
    return async () => {
      const cleanup = await cleanupPromise;
      if (cleanup) {
        cleanup();
      }
    };
  }, [authUser]);

  return { socket, isConnected };
};

export default useSocket;
