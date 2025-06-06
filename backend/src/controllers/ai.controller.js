import { GoogleGenerativeAI } from '@google/generative-ai';
import Message from '../models/Message.js';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export const chatWithAI = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user._id;

    // Generate conversationId if not provided
    const chatId = conversationId || `ai_${userId}_${Date.now()}`;

    // Save user message first with required fields
    const userMessage = new Message({
      text: message,
      user: {
        _id: userId,
        name: req.user.fullName,
        image: req.user.profilePic
      },
      chatId: chatId,
      chatType: 'ai', // Required field
      isAIMessage: false
    });
    await userMessage.save();

    // Get conversation history for context
    const conversationHistory = await Message.find({
      chatId: chatId,
      chatType: 'ai'
    }).sort({ createdAt: 1 }).limit(10);

    // Get the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


    // Build conversation context
    let contextPrompt = "You are a helpful AI assistant integrated into a video conferencing app. Be friendly, concise, and helpful.\n\n";
    
    // Add conversation history
    conversationHistory.slice(0, -1).forEach(msg => {
      if (msg.user && msg.user._id) {
        contextPrompt += `User: ${msg.text}\n`;
      } else {
        contextPrompt += `Assistant: ${msg.text}\n`;
      }
    });
    
    contextPrompt += `User: ${message}\nAssistant:`;

    // Generate response
    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    // Save AI response with required fields
    const aiMessage = new Message({
      text: aiResponse,
      user: {
        _id: null, // AI has no user ID
        name: 'AI Assistant',
        image: null
      },
      chatId: chatId,
      chatType: 'ai', // Required field
      isAIMessage: true
    });
    await aiMessage.save();

    res.json({
      success: true,
      userMessage: userMessage,
      aiMessage: aiMessage,
      conversationId: chatId
    });

  } catch (error) {
    console.error('Google AI Error:', error);
    
    res.status(500).json({
      success: false,
      message: 'AI service temporarily unavailable',
      error: error.message
    });
  }
};

export const getAIConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const messages = await Message.find({
      chatId: conversationId,
      chatType: 'ai'
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get AI conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
};

export const getAIConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          chatType: 'ai',
          'user._id': userId
        }
      },
      {
        $group: {
          _id: '$chatId',
          lastMessage: { $last: '$text' },
          lastMessageTime: { $last: '$createdAt' },
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { lastMessageTime: -1 } },
      { $limit: 20 }
    ]);

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Get AI conversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};
