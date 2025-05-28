import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import useAuthUser from '../hooks/useAuthUser';
import { useQuery } from '@tanstack/react-query';
import { getStreamToken, getMyGroups } from '../lib/api';
import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";

import { StreamChat } from 'stream-chat';
import ChatLoader from '../components/ChatLoader';
import { toast } from 'react-hot-toast';
import CallButton from '../components/CallButton';
import { PhoneIcon } from 'lucide-react'; // Add this import

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {
  const { id: chatId } = useParams();
  const navigate = useNavigate(); 
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ongoingCallId, setOngoingCallId] = useState(null); // Add this state

  const { authUser } = useAuthUser();

  // Detect if this is a group chat
  const isGroupChat = chatId?.startsWith('group-');
  const actualId = isGroupChat ? chatId.replace('group-', '') : chatId;

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Fetch groups if this is a group chat
  const { data: myGroups = [] } = useQuery({
    queryKey: ['myGroups'],
    queryFn: getMyGroups,
    enabled: !!authUser && isGroupChat
  });

  // Find the current group if this is a group chat
  const currentGroup = isGroupChat ? myGroups.find(group => group._id === actualId) : null;

  // Check for ongoing calls
  useEffect(() => {
    if (!channel) return;

    const checkOngoingCall = () => {
      // Listen for video call messages in the channel
      const handleNewMessage = (event) => {
        const message = event.message;
        if (message.text?.includes('📞') && message.text?.includes('call started')) {
          // Extract call ID from the message or use channel-based call ID
          const callId = isGroupCall ? `group-${actualId}` : channel.id;
          setOngoingCallId(callId);
          
          // Auto-clear after 30 seconds (optional)
          setTimeout(() => {
            setOngoingCallId(null);
          }, 30000);
        }
      };

      // Subscribe to new messages
      channel.on('message.new', handleNewMessage);

      return () => {
        channel.off('message.new', handleNewMessage);
      };
    };

    const cleanup = checkOngoingCall();
    return cleanup;
  }, [channel, isGroupChat, actualId]);

  useEffect(() => {
    const initChat = async () => {
      if (!tokenData?.token || !authUser) return;

      if (isGroupChat && myGroups.length === 0) return;

      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);

        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );

        let currChannel;

        if (isGroupChat && currentGroup) {
          const channelId = `group-${actualId}`;
          currChannel = client.channel("messaging", channelId, {
            name: currentGroup.name,
            image: currentGroup.image || '',
            members: currentGroup.members.map(member => member._id || member.id),
          });
        } else if (!isGroupChat) {
          const channelId = [authUser._id, actualId].sort().join('-');
          currChannel = client.channel("messaging", channelId, {
            members: [authUser._id, actualId],
          });
        }

        if (currChannel) {
          await currChannel.watch();
          setChatClient(client);
          setChannel(currChannel);
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not connect to chat. Please try again");
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [tokenData, authUser, actualId, isGroupChat, currentGroup, myGroups]);

  const handleVideoCall = () => {
    if (channel) {
      if (isGroupChat) {
        navigate(`/call/group-${actualId}`);
        
        channel.sendMessage({
          text: `📞 Group video call started`
        });
      } else {
        navigate(`/call/${channel.id}`);
        
        channel.sendMessage({
          text: `📞 Video call started`
        });
      }
    }
  };

  const handleJoinCall = () => {
    if (ongoingCallId) {
      navigate(`/call/${ongoingCallId}`);
      setOngoingCallId(null); // Clear the banner after joining
    }
  };

  // Handle group chat specific loading and error states
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

  if (loading || !chatClient || !channel) return <ChatLoader />;

  return (
    <div className='h-[93vh]'>
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <div className='w-full relative'>
            <CallButton handleVideoCall={handleVideoCall}/>
            
            {/* Join ongoing call banner */}
            {ongoingCallId && (
              <div className="absolute top-16 left-0 right-0 z-10 mx-4">
                <div 
                  className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg cursor-pointer hover:bg-green-200 transition-colors flex items-center justify-between"
                  onClick={handleJoinCall}
                >
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="size-5" />
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

            <Window>
              <ChannelHeader 
                title={isGroupChat ? currentGroup?.name : undefined}
              />
              <MessageList />
              <MessageInput focus />
            </Window>
          </div>
          <Thread/>
        </Channel>
      </Chat>
    </div>
  );
};

export default ChatPage;
