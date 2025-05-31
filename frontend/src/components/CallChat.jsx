import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getStreamToken } from '../lib/api';
import useAuthUser from '../hooks/useAuthUser';
import { useGlobalSocket } from '../context/SocketContext';
import useCallChat from '../hooks/useCallChat';
import {
  Call,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  SpeakerLayout,
  useCallStateHooks
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { 
  MicIcon, 
  MicOffIcon, 
  VideoIcon, 
  VideoOffIcon, 
  MonitorIcon,
  PhoneOffIcon,
  MessageCircleIcon,
  UsersIcon,
  SendIcon,
  XIcon,
  HandIcon,
  SmileIcon,
  ClockIcon
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

// CSS for speaking animations
const speakingStyles = `
  .speaking-border {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
  }
  
  .speaking-border::before {
    content: '';
    position: absolute;
    inset: -4px;
    background: linear-gradient(45deg, #22c55e, #16a34a);
    border-radius: 12px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .speaking-border.is-speaking::before {
    opacity: 1;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
`;

// Stream Client Singleton Manager
class StreamClientManager {
  constructor() {
    this.client = null;
    this.currentUserId = null;
  }

  async getClient(apiKey, user, token) {
    // If client exists for same user, reuse it
    if (this.client && this.currentUserId === user.id) {
      console.log('♻️ Reusing existing Stream client');
      return this.client;
    }

    // Cleanup existing client if user changed
    if (this.client && this.currentUserId !== user.id) {
      console.log('🧹 Cleaning up old Stream client');
      await this.cleanup();
    }

    // Create new client
    console.log('🆕 Creating new Stream client');
    this.client = new StreamVideoClient({
      apiKey,
      user,
      token,
    });

    this.currentUserId = user.id;
    return this.client;
  }

  async cleanup() {
    if (this.client) {
      try {
        await this.client.disconnectUser();
        console.log('✅ Stream client cleaned up');
      } catch (error) {
        console.error('❌ Error cleaning up Stream client:', error);
      }
      this.client = null;
      this.currentUserId = null;
    }
  }
}

const streamClientManager = new StreamClientManager();

// Timer Component
const CallTimer = ({ startTime }) => {
  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      if (startTime) {
        const now = new Date();
        const diff = now - startTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setDuration(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg flex items-center gap-2 z-40">
      <ClockIcon className="size-4" />
      <span className="font-mono text-sm">{duration}</span>
    </div>
  );
};

// Call Chat Component
const CallChat = ({ 
  isOpen, 
  onClose, 
  messages, 
  newMessage, 
  onTyping, 
  onSendMessage, 
  typing 
}) => {
  const messagesEndRef = React.useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-base-100 shadow-xl z-50 flex flex-col border-l border-base-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-base-200 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircleIcon className="size-4" />
          Call Chat
        </h3>
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-base-content opacity-50 mt-10">
            <MessageCircleIcon className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No messages in this call yet</p>
            <p className="text-xs">Start chatting during the call</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-1">
              {/* Message Header */}
              <div className="flex items-center gap-2">
                <div className="avatar">
                  <div className="w-5 h-5 rounded-full">
                    <img
                      src={message.user.image}
                      alt={message.user.name}
                      onError={(e) => {
                        e.target.src = `https://avatar.iran.liara.run/public/${Math.floor(Math.random()*100)+1}.png`;
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium text-base-content">
                  {message.user.name}
                </span>
                <span className="text-xs opacity-50">
                  {new Date(message.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {/* Message Content */}
              <div className="ml-7 text-sm bg-base-200 rounded-lg px-3 py-2 max-w-xs break-words">
                {message.text}
              </div>
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {typing.length > 0 && (
          <div className="flex items-center gap-2 ml-7 text-xs opacity-70">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <span>{typing.map(t => t.username).join(', ')} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSendMessage} className="p-3 border-t bg-base-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={onTyping}
            placeholder="Message during call..."
            className="input input-bordered input-sm flex-1 text-sm"
            maxLength={300}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="btn btn-primary btn-sm"
          >
            <SendIcon className="size-3" />
          </button>
        </div>
        
        {/* Character count */}
        {newMessage.length > 250 && (
          <div className="text-xs text-right mt-1 opacity-60">
            {newMessage.length}/300
          </div>
        )}
      </form>
    </div>
  );
};

// Participants Panel
const ParticipantsPanel = ({ isOpen, onClose, participants, speakingUsers }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-base-100 shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-base-200 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <UsersIcon className="size-4" />
          Participants ({participants.length})
        </h3>
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {participants.map((participant) => (
          <div 
            key={participant.sessionId} 
            className={`flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-all ${
              speakingUsers.has(participant.userId) ? 'bg-green-100 border-l-4 border-green-500' : ''
            }`}
          >
            <div className={`avatar ${speakingUsers.has(participant.userId) ? 'ring-2 ring-green-400' : ''}`}>
              <div className="w-10 h-10 rounded-full">
                <img
                  src={participant.image || `https://avatar.iran.liara.run/public/${Math.floor(Math.random()*100)+1}.png`}
                  alt={participant.name}
                />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm flex items-center gap-2">
                {participant.name}
                {speakingUsers.has(participant.userId) && (
                  <span className="text-green-500 text-xs">Speaking</span>
                )}
              </p>
              <div className="flex items-center gap-2 text-xs opacity-70">
                {!participant.publishedTracks.includes('audio') && (
                  <MicOffIcon className="size-3 text-red-500" />
                )}
                {!participant.publishedTracks.includes('video') && (
                  <VideoOffIcon className="size-3 text-red-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Reactions Overlay
const ReactionsOverlay = ({ reactions }) => {
  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40">
      <div className="flex gap-2">
        {reactions.map((reaction, index) => (
          <div
            key={reaction.id}
            className="text-4xl animate-bounce"
            style={{
              animationDelay: `${index * 0.1}s`,
              animationDuration: '3s',
              animationIterationCount: 1
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom Call Controls
const CustomCallControls = ({ 
  call,
  onToggleChat,
  onToggleParticipants,
  isChatOpen,
  isParticipantsOpen,
  onReaction,
  isHandRaised,
  onToggleHand,
  onLeaveCall,
  onForceLeave
}) => {
  const { 
    useMicrophoneState, 
    useCameraState, 
    useScreenShareState 
  } = useCallStateHooks();
  
  const { microphone, isMute } = useMicrophoneState();
  const { camera, isMute: isCameraMute } = useCameraState();
  const { screenShare, hasScreenShare } = useScreenShareState();

  const [showReactions, setShowReactions] = useState(false);

  const reactions = [
    { emoji: '👍', name: 'thumbs up' },
    { emoji: '❤️', name: 'heart' },
    { emoji: '😀', name: 'smile' },
    { emoji: '👏', name: 'clap' },
    { emoji: '🎉', name: 'party' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
      <div className="flex items-center justify-center gap-4">
        {/* Mic Toggle */}
        <button
          onClick={() => microphone.toggle()}
          className={`btn btn-circle btn-lg ${isMute ? 'btn-error' : 'btn-success'}`}
          title={isMute ? 'Unmute' : 'Mute'}
        >
          {isMute ? <MicOffIcon className="size-6" /> : <MicIcon className="size-6" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={() => camera.toggle()}
          className={`btn btn-circle btn-lg ${isCameraMute ? 'btn-error' : 'btn-success'}`}
          title={isCameraMute ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCameraMute ? <VideoOffIcon className="size-6" /> : <VideoIcon className="size-6" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={() => screenShare.toggle()}
          className={`btn btn-circle btn-lg ${hasScreenShare ? 'btn-primary' : 'btn-ghost btn-outline'}`}
          title={hasScreenShare ? 'Stop sharing' : 'Share screen'}
        >
          <MonitorIcon className="size-6" />
        </button>

        {/* Reactions */}
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="btn btn-circle btn-lg btn-ghost btn-outline"
            title="Reactions"
          >
            <SmileIcon className="size-6" />
          </button>
          
          {showReactions && (
            <div className="absolute bottom-full mb-2 bg-base-100 rounded-lg shadow-lg p-2 flex gap-2">
              {reactions.map((reaction) => (
                <button
                  key={reaction.name}
                  onClick={() => {
                    onReaction(reaction.emoji);
                    setShowReactions(false);
                  }}
                  className="btn btn-ghost btn-sm text-xl hover:scale-125 transition-transform"
                  title={reaction.name}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Raise Hand */}
        <button
          onClick={onToggleHand}
          className={`btn btn-circle btn-lg ${isHandRaised ? 'btn-warning' : 'btn-ghost btn-outline'}`}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
        >
          <HandIcon className="size-6" />
        </button>

        {/* Chat Toggle */}
        <button
          onClick={onToggleChat}
          className={`btn btn-circle btn-lg ${isChatOpen ? 'btn-primary' : 'btn-ghost btn-outline'}`}
          title="Toggle Chat"
        >
          <MessageCircleIcon className="size-6" />
        </button>

        {/* Participants Toggle */}
        <button
          onClick={onToggleParticipants}
          className={`btn btn-circle btn-lg ${isParticipantsOpen ? 'btn-primary' : 'btn-ghost btn-outline'}`}
          title="Toggle Participants"
        >
          <UsersIcon className="size-6" />
        </button>

        {/* Force Leave (Debug) - Remove in production */}
        <button
          onClick={onForceLeave}
          className="btn btn-circle btn-lg btn-warning"
          title="Force Leave All Instances"
        >
          🔨
        </button>

        {/* Leave Call */}
        <button
          onClick={onLeaveCall}
          className="btn btn-circle btn-lg btn-error"
          title="Leave Call"
        >
          <PhoneOffIcon className="size-6" />
        </button>
      </div>
    </div>
  );
};

const CallPage = () => {
  const { id: callId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const { emitCallEvent } = useGlobalSocket();
  
  // Use the call chat hook (now uses global socket internally)
  const {
    messages,
    newMessage,
    typing,
    sendMessage,
    handleTyping
  } = useCallChat(authUser, callId);

  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Debug useEffect
  useEffect(() => {
    console.log('🔍 DEBUG - CallPage mounted for callId:', callId);
    return () => {
      console.log('🔍 DEBUG - CallPage unmounting for callId:', callId);
    };
  }, [callId]);

  // Monitor participants
  useEffect(() => {
    console.log('🔍 DEBUG - Participants changed:', participants.map(p => ({
      name: p.name,
      sessionId: p.sessionId,
      userId: p.userId
    })));
  }, [participants]);

  // Window/Tab close detection
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (call) {
        try {
          await call.leave();
        } catch (error) {
          console.error('Error in beforeunload:', error);
        }
      }
      
      if (emitCallEvent) {
        const isGroupCall = callId?.startsWith('group-');
        const actualId = isGroupCall ? callId.replace('group-', '') : callId;
        const chatId = isGroupCall ? callId : (
          authUser ? [authUser._id, actualId].sort().join('-') : callId
        );
        
        emitCallEvent('user_left_call', {
          callId,
          chatId,
          chatType: isGroupCall ? 'group' : 'direct',
          participantCount: 0 // Force end call on page close
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [call, emitCallEvent, callId, authUser]);

  // Initialize Stream Video
  useEffect(() => {
    if (!tokenData?.token || !authUser) return;

    const initCall = async () => {
      try {
        // Use singleton client
        const videoClient = await streamClientManager.getClient(
          STREAM_API_KEY,
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );

        const videoCall = videoClient.call('default', callId);
        
        // Check if already in this call and leave first
        try {
          const currentState = videoCall.state.callingState;
          if (currentState === 'joined' || currentState === 'joining') {
            console.log('Already in this call, leaving first');
            await videoCall.leave();
            // Wait a bit for cleanup
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.log('No existing call to leave');
        }

        await videoCall.join({ create: true });

        setClient(videoClient);
        setCall(videoCall);
        setCallStartTime(new Date());

        // Determine chat info for socket events
        const isGroupCall = callId?.startsWith('group-');
        const actualId = isGroupCall ? callId.replace('group-', '') : callId;
        const chatId = isGroupCall ? callId : (
          authUser ? [authUser._id, actualId].sort().join('-') : callId
        );

        // Listen for participants
        videoCall.on('call.session_participant_joined', () => {
          const newParticipants = videoCall.state.participants;
          setParticipants(newParticipants);
          console.log('Participants after join:', newParticipants.length);
          
          // Notify socket about user joining call
          if (emitCallEvent) {
            emitCallEvent('user_joined_call', {
              callId,
              chatId,
              chatType: isGroupCall ? 'group' : 'direct'
            });
          }
        });

        videoCall.on('call.session_participant_left', () => {
          const newParticipants = videoCall.state.participants;
          setParticipants(newParticipants);
          console.log('Participants after leave:', newParticipants.length);
          
          // Notify socket about user leaving call
          if (emitCallEvent) {
            emitCallEvent('user_left_call', {
              callId,
              chatId,
              chatType: isGroupCall ? 'group' : 'direct',
              participantCount: newParticipants.length
            });
          }
        });

        // Listen for speaking events
        videoCall.on('call.speaking_changed', (event) => {
          setSpeakingUsers(new Set(event.speaking_users));
        });

        // Set initial participants
        setParticipants(videoCall.state.participants);

      } catch (error) {
        console.error('Error joining call:', error);
        navigate('/');
      }
    };

    initCall();

    return () => {
      const cleanup = async () => {
        console.log('🧹 Starting CallPage cleanup');
        
        // Notify about leaving call before cleanup
        if (call && emitCallEvent) {
          const isGroupCall = callId?.startsWith('group-');
          const actualId = isGroupCall ? callId.replace('group-', '') : callId;
          const chatId = isGroupCall ? callId : (
            authUser ? [authUser._id, actualId].sort().join('-') : callId
          );
          
          emitCallEvent('user_left_call', {
            callId,
            chatId,
            chatType: isGroupCall ? 'group' : 'direct',
            participantCount: Math.max(0, participants.length - 1)
          });
        }
        
        // Proper Stream cleanup
        if (call) {
          try {
            await call.leave();
            console.log('✅ Left call successfully');
          } catch (error) {
            console.error('❌ Error leaving call:', error);
          }
        }
      };
      
      cleanup();
    };
  }, [tokenData, authUser, callId, navigate, emitCallEvent]);

  const handleReaction = (emoji) => {
    const newReaction = { emoji, id: Date.now() };
    setReactions(prev => [...prev, newReaction]);
    
    // Remove reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 3000);
  };

  const handleToggleHand = () => {
    setIsHandRaised(!isHandRaised);
  };

  const handleLeaveCall = async () => {
    try {
      if (call) {
        await call.leave();
      }
      navigate(-1);
    } catch (error) {
      console.error('Error leaving call:', error);
      navigate(-1);
    }
  };

  // Force leave all instances (debug function)
  const forceLeaveCall = async () => {
    try {
      if (call) {
        await call.leave();
      }
      
      // Force disconnect all instances
      if (client) {
        const allCalls = client.state.calls || [];
        for (const c of allCalls) {
          if (c.id === callId) {
            try {
              await c.leave();
            } catch (error) {
              console.error('Error forcing leave call:', error);
            }
          }
        }
      }
      
      console.log('🔨 Force left all call instances');
      
      // Optionally reload the page to ensure clean state
      // window.location.reload();
      
    } catch (error) {
      console.error('Error in force leave:', error);
    }
  };

  if (!client || !call) return <PageLoader />;

  return (
    <div className="h-screen relative bg-black">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          {/* Add speaking styles */}
          <style>{speakingStyles}</style>
          
          {/* Call Timer */}
          <CallTimer startTime={callStartTime} />

          {/* Reactions Overlay */}
          <ReactionsOverlay reactions={reactions} />

          {/* Video Layout */}
          <div className={`transition-all duration-300 ${(isChatOpen || isParticipantsOpen) ? 'mr-80' : ''}`}>
            <SpeakerLayout />
          </div>

          {/* Custom Controls */}
          <CustomCallControls 
            call={call}
            onToggleChat={() => {
              setIsChatOpen(!isChatOpen);
              setIsParticipantsOpen(false);
            }}
            onToggleParticipants={() => {
              setIsParticipantsOpen(!isParticipantsOpen);
              setIsChatOpen(false);
            }}
            isChatOpen={isChatOpen}
            isParticipantsOpen={isParticipantsOpen}
            onReaction={handleReaction}
            isHandRaised={isHandRaised}
            onToggleHand={handleToggleHand}
            onLeaveCall={handleLeaveCall}
            onForceLeave={forceLeaveCall}
          />

          {/* Call Chat Component */}
          <CallChat
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={messages}
            newMessage={newMessage}
            onTyping={handleTyping}
            onSendMessage={sendMessage}
            typing={typing}
          />

          {/* Participants Panel */}
          <ParticipantsPanel
            isOpen={isParticipantsOpen}
            onClose={() => setIsParticipantsOpen(false)}
            participants={participants}
            speakingUsers={speakingUsers}
          />
        </StreamCall>
      </StreamVideo>
    </div>
  );
};

export default CallPage;
