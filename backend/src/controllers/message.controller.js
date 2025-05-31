import Message from '../models/Message.js';

export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    console.log(`Fetching messages for chat: ${chatId}`);

    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 }) // Get newest first
      .skip(skip)
      .limit(limit);

    // Reverse to show oldest first in chat
    const orderedMessages = messages.reverse();

    console.log(`Found ${orderedMessages.length} messages for chat ${chatId}`);

    res.status(200).json({
      messages: orderedMessages,
      hasMore: messages.length === limit,
      total: await Message.countDocuments({ chatId })
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const saveMessage = async (req, res) => {
  try {
    const { text, chatId, chatType } = req.body;
    
    const message = new Message({
      text,
      user: {
        _id: req.user._id,
        name: req.user.fullName,
        image: req.user.profilePic
      },
      chatId,
      chatType
    });

    await message.save();
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
