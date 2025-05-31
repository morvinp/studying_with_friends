import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';

let io;

export const initializeSocket = (server) => {
  console.log('🚀 Initializing Socket.io server...');
  
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? process.env.FRONTEND_URL 
        : "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware (keep existing)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.username = user.fullName;
      socket.profilePic = user.profilePic;
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User ${socket.username} connected`);

    socket.join(socket.userId);

    socket.on('join_chat', ({ chatId, chatType }) => {
      socket.join(chatId);
      console.log(`${socket.username} joined chat: ${chatId}`);
    });

    // Updated send_message handler with database persistence
    socket.on('send_message', async ({ chatId, message, chatType }) => {
      try {
        // For direct messages, ensure consistent chatId format
        let finalChatId = chatId;
        if (chatType === 'direct' && !chatId.startsWith('group-')) {
          const userIds = chatId.split('-');
          if (userIds.length === 2) {
            finalChatId = userIds.sort().join('-');
          }
        }

        // Save message to database
        const newMessage = new Message({
          text: message,
          user: {
            _id: socket.userId,
            name: socket.username,
            image: socket.profilePic
          },
          chatId: finalChatId,
          chatType
        });

        const savedMessage = await newMessage.save();

        // Create message data for broadcasting
        const messageData = {
          _id: savedMessage._id,
          text: savedMessage.text,
          user: savedMessage.user,
          createdAt: savedMessage.createdAt,
          chatId: savedMessage.chatId,
          chatType: savedMessage.chatType
        };

        // Broadcast to all users in the chat room
        io.to(chatId).emit('new_message', messageData);
        
        console.log(`Message saved and broadcasted in chat ${finalChatId}`);
        
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Keep existing typing handlers
    socket.on('typing_start', ({ chatId }) => {
      socket.to(chatId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('typing_stop', ({ chatId }) => {
      socket.to(chatId).emit('user_stop_typing', {
        userId: socket.userId
      });
    });

    socket.on('leave_chat', ({ chatId }) => {
      socket.leave(chatId);
    });

    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.username} disconnected`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
