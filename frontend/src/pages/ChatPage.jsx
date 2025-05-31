import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import useAuthUser from '../hooks/useAuthUser';
import useSocket from '../hooks/useSocket';
import { useQuery } from '@tanstack/react-query';
import { getMyGroups, getChatMessages, getUserById } from '../lib/api';
import ChatLoader from '../components/ChatLoader';
import { toast } from 'react-hot-toast';
import { 
  PhoneIcon, 
  SendIcon, 
  MoreVerticalIcon,
  UserIcon
} from 'lucide-react';

const generateChatId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('-');
};

// Audio notification function
const playMentionSound = () => {
  try {
    // Option 1: Use a sound file (place mention.mp3 in public/sounds/)
    const audio = new Audio('/sounds/mention.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Option 2: Create a beep sound (fallback)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    });
  } catch (error) {
    console.log('Audio not supported:', error);
  }
};

// Detect mentions in text
const detectMentions = (text) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  
  return mentions;
};

// Render text with highlighted mentions
const renderMessageWithMentions = (text, currentUserName) => {
  const mentionRegex = /@(\w+)/g;
  const parts = text.split(mentionRegex);
  
  return parts.map((part, index) => {
    if (index % 2 === 1) { // This is a mention
      const isCurrentUser = part.toLowerCase() === currentUserName.toLowerCase().replace(/\s+/g, '') ||
                            part.toLowerCase() === currentUserName.toLowerCase().split(' ')[0].toLowerCase();
      return (
        <span 
          key={index} 
          className={`font-bold ${isCurrentUser ? 'bg-yellow-200 text-yellow-800 px-1 rounded' : 'text-blue-600'}`}
        >
          @{part}
        </span>
      );
    }
    return part;
  });
};

// CSS for call button animation
const callButtonAnimation = `
  @keyframes callPulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
    }
    70% {
      transform: scale(1.05);
      box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    }
  }
  
  .call-button-pulse {
    animation: callPulse 2s infinite;
  }
`;

const ChatPage = () => {
  const { id: rawChatId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const { socket, isConnected } = useSocket(authUser);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState([]);
  const [ongoingCallId, setOngoingCallId] = useState(null);
  
  // Mention autocomplete states
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  
  const isGroupChat = rawChatId?.startsWith('group-');
  
  const chatId = useMemo(() => {
    if (!authUser) return rawChatId;
    
    if (isGroupChat) {
      return rawChatId;
    } else {
      const otherUserId = rawChatId;
      return generateChatId(authUser._id, otherUserId);
    }
  }, [rawChatId, authUser?._id, isGroupChat]);

  const actualId = isGroupChat ? rawChatId.replace('group-', '') : rawChatId;
  
  const { data: otherUser } = useQuery({
    queryKey: ['user', rawChatId],
    queryFn: () => getUserById(rawChatId),
    enabled: !!rawChatId && !isGroupChat && !!authUser
  });

  const { data: messageHistory, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => getChatMessages(chatId),
    enabled: !!chatId && !!authUser
  });

  const { data: myGroups = [] } = useQuery({
    queryKey: ['myGroups'],
    queryFn: getMyGroups,
    enabled: !!authUser && isGroupChat
  });

  const currentGroup = isGroupChat ? myGroups.find(group => group._id === actualId) : null;

  // Get group members for mentions
  const getGroupMembers = () => {
    if (!isGroupChat || !currentGroup) return [];
    return currentGroup.members?.filter(member => member._id !== authUser._id) || [];
  };

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (messageHistory?.messages) {
      console.log('Loading message history:', messageHistory.messages.length, 'messages');
      setMessages(messageHistory.messages);
    }
  }, [messageHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket || !chatId) return;

    console.log('Setting up socket listeners for chat:', chatId);

    socket.emit('join_chat', {
      chatId,
      chatType: isGroupChat ? 'group' : 'direct'
    });

    const handleNewMessage = (message) => {
      console.log('Received new message:', message);
      setMessages(prev => {
        if (prev.find(m => m._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Check for @mentions
      const mentions = detectMentions(message.text);
      const currentUserMentioned = mentions.some(mention => 
        mention.toLowerCase() === authUser.fullName.toLowerCase().replace(/\s+/g, '') ||
        mention.toLowerCase() === authUser.fullName.toLowerCase().split(' ')[0].toLowerCase()
      );

      // Play sound if current user is mentioned and it's not their own message
      if (currentUserMentioned && message.user._id !== authUser._id && isGroupChat) {
        console.log('🔔 You were mentioned!');
        playMentionSound();
        
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(`${message.user.name} mentioned you in ${currentGroup?.name || 'Group Chat'}`, {
            body: message.text,
            icon: message.user.image,
            tag: 'mention'
          });
        }
      }

      // Check for call messages and show join call option for others
      if (message.text?.includes('📞') && message.text?.includes('call started') && message.user._id !== authUser._id) {
        const callId = isGroupChat ? `group-${actualId}` : chatId;
        setOngoingCallId(callId);
        
        setTimeout(() => {
          setOngoingCallId(null);
        }, 30000);
      }
    };

    socket.on('new_message', handleNewMessage);

    socket.on('user_typing', ({ userId, username }) => {
      if (userId !== authUser._id) {
        setTyping(prev => {
          if (!prev.find(user => user.userId === userId)) {
            return [...prev, { userId, username }];
          }
          return prev;
        });
      }
    });

    socket.on('user_stop_typing', ({ userId }) => {
      setTyping(prev => prev.filter(user => user.userId !== userId));
    });

    socket.on('user_joined', ({ userId, username, profilePic }) => {
      console.log(`${username} joined the chat`);
    });

    socket.on('user_left', ({ userId, username }) => {
      console.log(`${username} left the chat`);
    });

    socket.on('message_error', ({ error }) => {
      toast.error(error);
    });

    return () => {
      socket.emit('leave_chat', { chatId });
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('message_error');
    };
  }, [socket, chatId, authUser, isGroupChat, actualId, currentGroup]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket) return;

    console.log('Sending message to chatId:', chatId);

    socket.emit('send_message', {
      chatId,
      message: newMessage.trim(),
      chatType: isGroupChat ? 'group' : 'direct'
    });

    setNewMessage('');
    setShowMentionSuggestions(false);
    socket.emit('typing_stop', { chatId });
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Check for @mention autocomplete
    if (isGroupChat) {
      const atIndex = value.lastIndexOf('@');
      if (atIndex !== -1) {
        const afterAt = value.slice(atIndex + 1);
        const spaceIndex = afterAt.indexOf(' ');
        
        if (spaceIndex === -1) { // Still typing the mention
          const query = afterAt.toLowerCase();
          const members = getGroupMembers();
          
          const suggestions = members.filter(member => {
            const firstName = member.fullName.split(' ')[0].toLowerCase();
            const fullName = member.fullName.toLowerCase();
            return firstName.includes(query) || fullName.includes(query);
          }).slice(0, 5);
          
          setMentionQuery(query);
          setMentionSuggestions(suggestions);
          setShowMentionSuggestions(suggestions.length > 0 && query.length > 0);
        } else {
          setShowMentionSuggestions(false);
        }
      } else {
        setShowMentionSuggestions(false);
      }
    }

    if (!socket) return;

    socket.emit('typing_start', { chatId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { chatId });
    }, 2000);
  };

  // Handle mention selection
  const selectMention = (member) => {
    const atIndex = newMessage.lastIndexOf('@');
    const beforeAt = newMessage.slice(0, atIndex);
    const afterMention = newMessage.slice(atIndex + 1 + mentionQuery.length);
    
    const firstName = member.fullName.split(' ')[0];
    setNewMessage(`${beforeAt}@${firstName} ${afterMention}`);
    setShowMentionSuggestions(false);
    
    // Focus back on input
    inputRef.current?.focus();
  };

  // Handle keyboard navigation for mentions
  const handleKeyDown = (e) => {
    if (showMentionSuggestions) {
      if (e.key === 'Escape') {
        setShowMentionSuggestions(false);
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // You can implement arrow key navigation here if needed
        e.preventDefault();
      } else if (e.key === 'Tab' && mentionSuggestions.length > 0) {
        selectMention(mentionSuggestions[0]);
        e.preventDefault();
      }
    }
  };

  const handleVideoCall = () => {
    if (socket) {
      const message = isGroupChat 
        ? '📞 Group video call started' 
        : '📞 Video call started';
      
      socket.emit('send_message', {
        chatId,
        message,
        chatType: isGroupChat ? 'group' : 'direct'
      });

      const callId = isGroupChat ? `group-${actualId}` : chatId;
      window.open(`/call/${callId}`, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    }
  };

  const handleJoinCall = () => {
    if (ongoingCallId) {
      window.open(`/call/${ongoingCallId}`, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      setOngoingCallId(null);
    }
  };

  if (isGroupChat && !currentGroup && myGroups.length > 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-center text-lg">Group not found or you're not a member.</p>
        <button 
          onClick={() => navigate('/groups')} 
          className="btn btn-primary mt-4"
        >
          Back to Groups
        </button>
      </div>
    );
  }

  if (loadingMessages) return <ChatLoader />;

  if (!isConnected) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-lg">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-[93vh] flex flex-col bg-base-100'>
      {/* Add call button animation styles */}
      <style>{callButtonAnimation}</style>
      
      {/* Header */}
      <div className='bg-base-200 border-b border-base-300 p-4 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='avatar'>
            <div className='w-10 h-10 rounded-full'>
              {isGroupChat ? (
                <div className='bg-primary text-primary-content flex items-center justify-center text-lg font-bold'>
                  {currentGroup?.name?.charAt(0) || 'G'}
                </div>
              ) : (
                otherUser?.profilePic ? (
                  <img
                    src={otherUser.profilePic}
                    alt={otherUser.fullName}
                    className='w-full h-full object-cover'
                    onError={(e) => {
                      e.target.src = `https://avatar.iran.liara.run/public/${Math.floor(Math.random()*100)+1}.png`;
                    }}
                  />
                ) : (
                  <div className='bg-secondary text-secondary-content flex items-center justify-center'>
                    <UserIcon className='size-5' />
                  </div>
                )
              )}
            </div>
          </div>
          <div>
            <h3 className='font-semibold'>
              {isGroupChat 
                ? currentGroup?.name || 'Group Chat' 
                : otherUser?.fullName || 'Loading...'
              }
            </h3>
            <p className='text-sm opacity-70'>
              {isConnected ? 'Connected' : 'Connecting...'}
              {isGroupChat && currentGroup?.members && (
                <span className='ml-2'>• {currentGroup.members.length} members</span>
              )}
            </p>
          </div>
        </div>
        
        <div className='flex items-center gap-2'>
          {ongoingCallId ? (
            <button 
              onClick={handleJoinCall}
              className={`btn btn-success btn-circle call-button-pulse`}
              title="Join ongoing call"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="size-5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" 
                />
              </svg>
            </button>
          ) : (
            <button 
              onClick={handleVideoCall}
              className='btn btn-primary btn-circle'
              title="Start video call"
              disabled={!isConnected}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="size-5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" 
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Join ongoing call banner */}
      {ongoingCallId && (
        <div className="bg-green-100 border-b border-green-300 p-3">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-green-200 rounded px-2 py-1"
            onClick={handleJoinCall}
          >
            <div className="flex items-center gap-2 text-green-800">
              <PhoneIcon className="size-4" />
              <span className="font-medium">
                {isGroupChat ? 'Group video call is ongoing' : 'Video call is ongoing'}
              </span>
            </div>
            <button className="btn btn-sm btn-success text-white">
              Join Call
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {messages.length === 0 ? (
          <div className='text-center text-base-content opacity-50 mt-20'>
            <p>No messages yet. Start the conversation!</p>
            {isGroupChat && (
              <p className='text-sm mt-2'>💡 Tip: Use @username to mention someone</p>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`chat ${
                message.user._id === authUser._id ? 'chat-end' : 'chat-start'
              }`}
            >
              <div className='chat-image avatar'>
                <div className='w-8 h-8 rounded-full'>
                  <img
                    src={message.user.image}
                    alt={message.user.name}
                    onError={(e) => {
                      e.target.src = `https://avatar.iran.liara.run/public/${Math.floor(Math.random()*100)+1}.png`;
                    }}
                  />
                </div>
              </div>
              <div className='chat-header text-xs opacity-50 mb-1'>
                {message.user.name}
                <time className='ml-2'>
                  {new Date(message.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </time>
              </div>
              <div className={`chat-bubble ${
                message.text.includes('📞') 
                  ? 'chat-bubble-info' 
                  : message.user._id === authUser._id 
                    ? 'chat-bubble-primary' 
                    : 'chat-bubble-secondary'
              }`}>
                {renderMessageWithMentions(message.text, authUser.fullName)}
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicators */}
        {typing.length > 0 && (
          <div className='chat chat-start'>
            <div className='chat-bubble bg-base-300 text-base-content'>
              <div className='flex items-center gap-2'>
                <div className='flex space-x-1'>
                  <div className='w-2 h-2 bg-current rounded-full animate-bounce'></div>
                  <div className='w-2 h-2 bg-current rounded-full animate-bounce' style={{animationDelay: '0.1s'}}></div>
                  <div className='w-2 h-2 bg-current rounded-full animate-bounce' style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className='text-xs'>
                  {typing.map(t => t.username).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Mention Suggestions */}
      {showMentionSuggestions && (
        <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg mx-4 mb-2 max-h-40 overflow-y-auto">
          {mentionSuggestions.map((member) => (
            <div
              key={member._id}
              className="flex items-center gap-3 p-2 hover:bg-base-200 cursor-pointer transition-colors"
              onClick={() => selectMention(member)}
            >
              <div className="avatar">
                <div className="w-8 h-8 rounded-full">
                  <img
                    src={member.profilePic}
                    alt={member.fullName}
                    onError={(e) => {
                      e.target.src = `https://avatar.iran.liara.run/public/${Math.floor(Math.random()*100)+1}.png`;
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">@{member.fullName.split(' ')[0]}</span>
                <div className="text-xs opacity-70">{member.fullName}</div>
              </div>
            </div>
          ))}
          {mentionSuggestions.length === 0 && mentionQuery && (
            <div className="p-2 text-sm text-base-content opacity-50 text-center">
              No members found
            </div>
          )}
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-warning text-warning-content text-center py-2 text-sm">
          Reconnecting to chat...
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className='p-4 bg-base-200 border-t border-base-300'>
        <div className='flex gap-2'>
          <input
            ref={inputRef}
            type='text'
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected 
                ? isGroupChat 
                  ? 'Type a message... (@username to mention)' 
                  : 'Type a message...' 
                : 'Connecting...'
            }
            className='input input-bordered flex-1'
            disabled={!isConnected}
            maxLength={1000}
          />
          <button
            type='submit'
            disabled={!newMessage.trim() || !isConnected}
            className='btn btn-primary'
            title="Send message"
          >
            <SendIcon className='size-4' />
          </button>
        </div>
        
        {newMessage.length > 800 && (
          <div className="text-xs text-base-content opacity-50 mt-1 text-right">
            {newMessage.length}/1000
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatPage;
