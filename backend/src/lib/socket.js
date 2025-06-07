// backend/src/lib/socket.js (complete code with cleaner duplicate prevention)
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import StudySession from '../models/StudySession.js';
import mongoose from 'mongoose';

let io;

// Global tracker for call participants
class CallParticipantsTracker {
  constructor() {
    this.callParticipants = {}; // key: callId, value: Set of userIds
  }

  userJoined(callId, userId) {
    if (!this.callParticipants[callId]) {
      this.callParticipants[callId] = new Set();
    }
    this.callParticipants[callId].add(userId);
    console.log(`👥 User ${userId} joined call ${callId}. Total participants: ${this.callParticipants[callId].size}`);
    
    // Check if there's an active study session and add user to it
    this.handleStudySessionJoin(callId, userId);
  }

  userLeft(callId, userId) {
    if (this.callParticipants[callId]) {
      this.callParticipants[callId].delete(userId);
      const remainingCount = this.callParticipants[callId].size;
      
      if (remainingCount === 0) {
        delete this.callParticipants[callId];
        // Check if there's an active study session and auto-stop it
        this.handleEmptyCallStudySession(callId);
      }
      
      console.log(`👥 User ${userId} left call ${callId}. Remaining participants: ${remainingCount}`);
      
      // Handle study session leave
      this.handleStudySessionLeave(callId, userId);
    }
  }

  handleEmptyCallStudySession(callId) {
    // Check both possible chat ID formats
    const possibleChatIds = [callId, `group-${callId}`];
    
    for (const chatId of possibleChatIds) {
      const session = activeStudySessions.get(chatId);
      if (session) {
        console.log(`📚 Sending auto-stop message in ${chatId} - no participants left in call`);
        this.sendAutoStopMessage(chatId); // Call the new function instead
        break;
      }
    }
  }


  async autoStopStudySession(chatId) {
    try {
      const session = activeStudySessions.get(chatId);
      if (!session) return;

      const endTime = new Date();
      const duration = Math.floor((endTime - session.startTime) / 1000 / 60);
      
      // Get all participants who were in the session (including those who left)
      const allOriginalParticipants = Array.from(session.originalParticipants);
      
      // Save study sessions for participants who haven't been saved yet
      for (const userId of allOriginalParticipants) {
        if (duration > 0 && !session.savedParticipants.has(userId)) {
          await saveStudySessionData(
            userId,
            chatId,
            `Group ${chatId.replace('group-', '')}`,
            duration,
            session.startTime,
            endTime,
            'auto_stopped'
          );
          session.savedParticipants.add(userId);
        }
      }

      const botMessageData = await createBotMessage(
        `📚 Study session automatically ended! 🔄\n\n⏱️ Duration: ${duration} minutes\n👥 All participants left the video call\n\n✅ Study time recorded for ${allOriginalParticipants.length} participants who participated.\n\nGreat work everyone! 🎉`,
        chatId,
        'group'
      );

      // Broadcast bot response
      if (io) {
        io.to(chatId).emit('new_message', botMessageData);
        
        // Emit study session ended event
        io.to(chatId).emit('study_session_ended', {
          chatId: chatId,
          endedBy: 'System (Auto-stop)',
          duration: duration,
          participantCount: allOriginalParticipants.length,
          participants: allOriginalParticipants,
          timestamp: endTime,
          autoStopped: true
        });
      }

      // Remove the session
      activeStudySessions.delete(chatId);

      console.log(`📚 Study session auto-stopped in ${chatId}. Duration: ${duration} minutes for ${allOriginalParticipants.length} participants`);
    } catch (error) {
      console.error('Error auto-stopping study session:', error);
    }
  }

  // Add this function after the autoStopStudySession function
  async sendAutoStopMessage(chatId) {
    try {
      const botMessageData = await createBotMessage(
        `📚 Study session automatically ended! 🔄\n\n👥 All participants left the video call\n\n✅ Study time has been recorded for each participant based on when they left.\n\nGreat work everyone! 🎉`,
        chatId,
        'group'
      );

      // Only broadcast notification, don't save any session data
      if (io) {
        io.to(chatId).emit('new_message', botMessageData);
        
        // Emit study session ended event
        io.to(chatId).emit('study_session_ended', {
          chatId: chatId,
          endedBy: 'System (All left)',
          timestamp: new Date(),
          autoStopped: true
        });
      }

      // Remove the session
      activeStudySessions.delete(chatId);

      console.log(`📚 Auto-stop message sent for ${chatId} - NO DATABASE SAVE`);
    } catch (error) {
      console.error('Error sending auto-stop message:', error);
    }
  }


  handleStudySessionJoin(callId, userId) {
    // Check both possible chat ID formats
    const possibleChatIds = [callId, `group-${callId}`];
    
    for (const chatId of possibleChatIds) {
      const session = activeStudySessions.get(chatId);
      if (session) {
        // Add user to active study session
        session.participants.add(userId);
        session.originalParticipants.add(userId); // Track all who ever participated
        console.log(`📚 User ${userId} joined active study session in ${chatId}`);
        
        // Notify the chat about the new participant
        this.notifyStudySessionUpdate(chatId, 'joined', userId);
        break;
      }
    }
  }

  handleStudySessionLeave(callId, userId) {
    // Check both possible chat ID formats
    const possibleChatIds = [callId, `group-${callId}`];
    
    for (const chatId of possibleChatIds) {
      const session = activeStudySessions.get(chatId);
      if (session && session.participants.has(userId)) {
        // Calculate study time for this user
        const currentTime = new Date();
        const studyDuration = Math.floor((currentTime - session.startTime) / 1000 / 60);
        
        // Save study session data ONLY if not already saved
        if (studyDuration > 0 && !session.savedParticipants.has(userId)) {
          saveStudySessionData(
            userId,
            chatId,
            `Group ${chatId.replace('group-', '')}`,
            studyDuration,
            session.startTime,
            currentTime,
            'left_early'
          );
          session.savedParticipants.add(userId); // Mark as saved to prevent duplicates
        }
        
        // Remove user from active study session
        session.participants.delete(userId);
        console.log(`📚 User ${userId} left study session in ${chatId}. Study time: ${studyDuration} minutes`);
        
        // Notify the chat about the participant leaving
        this.notifyStudySessionUpdate(chatId, 'left', userId, studyDuration);
        break;
      }
    }
  }

  notifyStudySessionUpdate(chatId, action, userId, duration = null) {
    if (io) {
      const eventData = {
        chatId,
        userId,
        action, // 'joined' or 'left'
        duration,
        timestamp: new Date(),
        activeParticipants: activeStudySessions.get(chatId)?.participants.size || 0
      };
      
      io.to(chatId).emit('study_session_participant_update', eventData);
    }
  }

  getParticipants(callId) {
    // Try both with and without 'group-' prefix
    const directCallId = callId.replace('group-', '');
    const groupCallId = callId.startsWith('group-') ? callId : `group-${callId}`;
    
    // Check direct callId first (this is what CallPage sends)
    if (this.callParticipants[directCallId]) {
      return Array.from(this.callParticipants[directCallId]);
    }
    
    // Fallback to group callId
    if (this.callParticipants[groupCallId]) {
      return Array.from(this.callParticipants[groupCallId]);
    }
    
    return [];
  }

  isUserInCall(callId, userId) {
    const participants = this.getParticipants(callId);
    return participants.includes(userId);
  }

  getParticipantCount(callId) {
    return this.getParticipants(callId).length;
  }
}

// Global instance
const callTracker = new CallParticipantsTracker();

// Global study sessions tracker with enhanced structure
const activeStudySessions = new Map(); // key: chatId, value: { startTime, participants: Set, originalParticipants: Set, savedParticipants: Set, startedBy }

// Function to save study session data
async function saveStudySessionData(userId, groupId, groupName, duration, startTime, endTime, sessionType = 'completed') {
  try {
    const studySession = new StudySession({
      userId,
      groupId,
      groupName,
      duration,
      startTime,
      endTime,
      sessionType
    });

    await studySession.save();
    console.log(`💾 Saved study session: User ${userId}, Duration: ${duration} minutes, Type: ${sessionType}`);
  } catch (error) {
    console.error('Error saving study session:', error);
  }
}

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

  // Authentication middleware
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

    // New event: User joins a video call
    socket.on('join_call', ({ callId }) => {
      console.log(`🔔 User ${socket.username} joining call: ${callId}`);
      callTracker.userJoined(callId, socket.userId);
      socket.join(`call-${callId}`);
      
      // Notify others in the call
      socket.to(`call-${callId}`).emit('user_joined_call', {
        userId: socket.userId,
        username: socket.username,
        participantCount: callTracker.getParticipantCount(callId)
      });
    });

    // New event: User leaves a video call
    socket.on('leave_call', ({ callId }) => {
      console.log(`🔔 User ${socket.username} leaving call: ${callId}`);
      callTracker.userLeft(callId, socket.userId);
      socket.leave(`call-${callId}`);
      
      // Notify others in the call
      socket.to(`call-${callId}`).emit('user_left_call', {
        userId: socket.userId,
        username: socket.username,
        participantCount: callTracker.getParticipantCount(callId)
      });
    });

    // Updated send_message handler with bot mention detection
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

        // Check for @bot mentions in group chats
        if (chatType === 'group' && detectBotMention(message)) {
          console.log('🤖 Bot mentioned in group chat:', message.substring(0, 50) + '...');
          
          // Handle study session commands
          await handleBotCommand(socket, chatId, finalChatId, message, chatType);
        }
        
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle disconnect - remove user from all calls
    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.username} disconnected`);
      
      // Remove user from all calls they might be in
      Object.keys(callTracker.callParticipants).forEach(callId => {
        if (callTracker.isUserInCall(callId, socket.userId)) {
          callTracker.userLeft(callId, socket.userId);
          socket.to(`call-${callId}`).emit('user_left_call', {
            userId: socket.userId,
            username: socket.username,
            participantCount: callTracker.getParticipantCount(callId)
          });
        }
      });
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
  });

  return io;
};

// Function to detect @bot mentions
function detectBotMention(message) {
  const botMentions = ['@bot', '@studybot', '@assistant'];
  const lowerMessage = message.toLowerCase();
  
  return botMentions.some(mention => lowerMessage.includes(mention));
}

// Function to handle bot commands
async function handleBotCommand(socket, chatId, finalChatId, message, chatType) {
  try {
    const lowerMessage = message.toLowerCase();
    
    // Study session commands
    if (lowerMessage.includes('start study') || lowerMessage.includes('begin study')) {
      await startStudySession(socket, chatId, finalChatId, chatType);
    } else if (lowerMessage.includes('end study') || lowerMessage.includes('stop study')) {
      await endStudySession(socket, chatId, finalChatId, chatType);
    } else if (lowerMessage.includes('study status') || lowerMessage.includes('study time')) {
      await getStudyStatus(socket, chatId, finalChatId, chatType);
    } else {
      // Show available commands
      await showBotHelp(socket, chatId, finalChatId, chatType);
    }
  } catch (error) {
    console.error('Error handling bot command:', error);
  }
}

// Function to create bot message
async function createBotMessage(text, chatId, chatType) {
  try {
    const botObjectId = new mongoose.Types.ObjectId();
    
    const botMessage = new Message({
      text: text,
      user: {
        _id: botObjectId,
        name: 'Study Bot',
        image: '/api/placeholder/40/40'
      },
      chatId: chatId,
      chatType: chatType,
      isBot: true,
      botType: 'study'
    });

    const savedBotMessage = await botMessage.save();

    return {
      _id: savedBotMessage._id,
      text: savedBotMessage.text,
      user: {
        _id: 'study-bot',
        name: savedBotMessage.user.name,
        image: savedBotMessage.user.image
      },
      createdAt: savedBotMessage.createdAt,
      chatId: savedBotMessage.chatId,
      chatType: savedBotMessage.chatType,
      isBot: true,
      botType: 'study'
    };
  } catch (error) {
    console.error('Error creating bot message:', error);
    throw error;
  }
}

// Function to start study session
async function startStudySession(socket, chatId, finalChatId, chatType) {
  try {
    console.log(`🔍 Checking participants for chat: ${finalChatId}`);
    const participantsInCall = callTracker.getParticipants(finalChatId);
    
    console.log(`👥 Found ${participantsInCall.length} participants in call:`, participantsInCall);
    
    if (participantsInCall.length === 0) {
      const botMessageData = await createBotMessage(
        "❌ No participants found in the video call. Please join the video call first to start a study session.",
        finalChatId,
        chatType
      );
      io.to(chatId).emit('new_message', botMessageData);
      return;
    }

    // Start study session with enhanced tracking
    activeStudySessions.set(finalChatId, {
      startTime: new Date(),
      participants: new Set(participantsInCall), // Currently active participants
      originalParticipants: new Set(participantsInCall), // All who ever participated
      savedParticipants: new Set(), // Track who has been saved to prevent duplicates
      startedBy: socket.userId
    });

    const botMessageData = await createBotMessage(
      `📚 Study session started! Tracking study time for ${participantsInCall.length} participants currently in the video call.\n\n🔄 **Auto-stop**: Session will automatically end if all participants leave the call.\n👥 **Real-time tracking**: Leave the call and your study time stops instantly.\n\nUse '@bot end study' to manually stop the session.`,
      finalChatId,
      chatType
    );

    // Broadcast bot response
    io.to(chatId).emit('new_message', botMessageData);
    
    // Emit study session started event
    io.to(chatId).emit('study_session_started', {
      chatId: finalChatId,
      startedBy: socket.username,
      participantCount: participantsInCall.length,
      participants: participantsInCall,
      timestamp: new Date()
    });

    console.log(`📚 Study session started in ${finalChatId} by ${socket.username} for ${participantsInCall.length} participants`);
  } catch (error) {
    console.error('Error starting study session:', error);
  }
}

// Function to end study session
async function endStudySession(socket, chatId, finalChatId, chatType) {
  try {
    const session = activeStudySessions.get(finalChatId);
    
    if (!session) {
      const botMessageData = await createBotMessage(
        "❌ No active study session found for this group.",
        finalChatId,
        chatType
      );
      io.to(chatId).emit('new_message', botMessageData);
      return;
    }

    // Calculate study duration
    const endTime = new Date();
    const duration = Math.floor((endTime - session.startTime) / 1000 / 60);
    
    // Get all participants who were in the session
    const allOriginalParticipants = Array.from(session.originalParticipants);
    const currentCallParticipants = callTracker.getParticipants(finalChatId);
    
    // Save study sessions for participants who haven't been saved yet
    for (const userId of allOriginalParticipants) {
      if (duration > 0 && !session.savedParticipants.has(userId)) {
        await saveStudySessionData(
          userId,
          finalChatId,
          `Group ${finalChatId.replace('group-', '')}`,
          duration,
          session.startTime,
          endTime,
          'completed'
        );
        session.savedParticipants.add(userId);
      }
    }

    console.log(`🔍 Session participants: ${allOriginalParticipants.length}`, allOriginalParticipants);
    console.log(`🔍 Current call participants: ${currentCallParticipants.length}`, currentCallParticipants);

    const botMessageData = await createBotMessage(
      `📚 Study session manually ended! Duration: ${duration} minutes.\n\n✅ Study time recorded for ${allOriginalParticipants.length} participants.\n\n📊 Participants who completed the full session: ${currentCallParticipants.filter(p => allOriginalParticipants.includes(p)).length}\n\nGreat work everyone! 🎉`,
      finalChatId,
      chatType
    );

    // Broadcast bot response
    io.to(chatId).emit('new_message', botMessageData);
    
    // Emit study session ended event
    io.to(chatId).emit('study_session_ended', {
      chatId: finalChatId,
      endedBy: socket.username,
      duration: duration,
      participantCount: allOriginalParticipants.length,
      participants: allOriginalParticipants,
      timestamp: endTime,
      autoStopped: false
    });

    // Remove the session
    activeStudySessions.delete(finalChatId);

    console.log(`📚 Study session manually ended in ${finalChatId} by ${socket.username}. Duration: ${duration} minutes for ${allOriginalParticipants.length} participants`);
  } catch (error) {
    console.error('Error ending study session:', error);
  }
}

// Function to get study status
async function getStudyStatus(socket, chatId, finalChatId, chatType) {
  try {
    const session = activeStudySessions.get(finalChatId);
    
    if (!session) {
      const botMessageData = await createBotMessage(
        "📊 No active study session found for this group. Use '@bot start study' to begin tracking.",
        finalChatId,
        chatType
      );
      io.to(chatId).emit('new_message', botMessageData);
      return;
    }

    // Calculate current duration
    const currentTime = new Date();
    const duration = Math.floor((currentTime - session.startTime) / 1000 / 60);
    
    // Get current participants in call and session
    const sessionParticipants = Array.from(session.participants);
    const callParticipants = callTracker.getParticipants(finalChatId);

    const botMessageData = await createBotMessage(
      `📊 Study session is active!\n\n⏱️ Duration: ${duration} minutes\n👥 Active participants: ${sessionParticipants.length}\n📞 Currently in call: ${callParticipants.length}\n\n🔄 Auto-stop: Session will end if all participants leave the call.\n✅ Time is being tracked for participants in the video call.`,
      finalChatId,
      chatType
    );

    io.to(chatId).emit('new_message', botMessageData);
  } catch (error) {
    console.error('Error getting study status:', error);
  }
}

// Function to show bot help
async function showBotHelp(socket, chatId, finalChatId, chatType) {
  try {
    const botMessageData = await createBotMessage(
      `🤖 Study Bot Commands:
      
• @bot start study - Begin tracking study time
• @bot end study - Stop tracking study time  
• @bot study status - Check current session status

📝 **Smart Features**: 
- 🔄 Auto-stop when all participants leave the call
- ⏱️ Real-time tracking: leave call = time stops
- 👥 Rejoin anytime to continue earning time

Join the video call first, then start the study session.`,
      finalChatId,
      chatType
    );

    io.to(chatId).emit('new_message', botMessageData);
  } catch (error) {
    console.error('Error showing bot help:', error);
  }
}

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const getCallTracker = () => callTracker;
