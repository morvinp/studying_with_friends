// frontend/src/pages/CallPage.jsx (integrated end call button)
import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import useAuthUser from '../hooks/useAuthUser';
import { useQuery } from '@tanstack/react-query';
import { getStreamToken } from '../lib/api';
import { StreamChat } from 'stream-chat';
import useSocket from '../hooks/useSocket';

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from 'react-hot-toast';
import PageLoader from '../components/PageLoader';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY

// Global client instance to prevent duplicates
let globalVideoClient = null;

const CallPage = () => {
  const {id: callId} = useParams();
  const {authUser, isLoading} = useAuthUser();
  const { socket } = useSocket(authUser);

  // Detect if this is a group call
  const isGroupCall = callId?.startsWith('group-');
  const actualCallId = isGroupCall ? callId.replace('group-', '') : callId;

  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  // Add useRef for state management
  const callEndedMessageSent = useRef(false);
  const lastParticipantCount = useRef(0);
  const hasHadParticipants = useRef(false);
  const hasNotifiedJoin = useRef(false);
  const hasNotifiedLeave = useRef(false);

  const { data: tokenData } = useQuery({
  queryKey: ["streamToken"],
  queryFn: getStreamToken,
  enabled: !!authUser,
  });

  useEffect(()=>{
    let isMounted = true;

    const initCall = async ()=>{
      if(!tokenData?.token || !authUser || !actualCallId) return;

      try{
        console.log("Initializing stream video client...");

        const user = {
          id:authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        }

        if (!globalVideoClient) {
          globalVideoClient = new StreamVideoClient({
            apiKey: STREAM_API_KEY,
            user,
            token: tokenData.token,
          });
        }

        if (!isMounted) return;

        const callInstance = globalVideoClient.call("default", actualCallId);

        await callInstance.join({create:true})

        console.log(`Joined ${isGroupCall ? 'group' : 'individual'} call successfully`);

        if (isMounted) {
          setClient(globalVideoClient)
          setCall(callInstance)
          
          // Notify backend that user joined the call
          if (socket && isGroupCall && !hasNotifiedJoin.current) {
            socket.emit('join_call', { callId: actualCallId });
            hasNotifiedJoin.current = true;
            console.log(`🔔 Notified backend: User joined call ${actualCallId}`);
          }
        }

      }catch(error){
        console.error("Error joining call: ",error);
        if (isMounted) {
          toast.error("Could not join the call. Please try again")
        }
      }finally{
        if (isMounted) {
          setIsConnecting(false);
        }
      }
    }

    initCall()

    return () => {
      isMounted = false;
      
      if (call) {
        console.log("Cleaning up call...");
        call.leave().catch(console.error);
        
        // Notify backend that user left the call
        if (socket && isGroupCall && hasNotifiedJoin.current && !hasNotifiedLeave.current) {
          socket.emit('leave_call', { callId: actualCallId });
          hasNotifiedLeave.current = true;
          console.log(`🔔 Notified backend: User left call ${actualCallId}`);
        }
      }
    };
  },[tokenData, authUser, actualCallId, socket]);

  // useRef-based participant monitoring
  useEffect(() => {
    if (!call || !isGroupCall) return;

    const handleParticipantChange = async () => {
      const currentCount = call.state.participants.length;
      
      console.log("Participant count changed:", lastParticipantCount.current, "->", currentCount);

      // Track if the call has ever had participants
      if (currentCount > 0) {
        hasHadParticipants.current = true;
        callEndedMessageSent.current = false; // Reset flag when participants join
      }

      // If we had participants before and now we have 0, and message not sent yet
      if (hasHadParticipants.current && 
          lastParticipantCount.current > 0 && 
          currentCount === 0 && 
          !callEndedMessageSent.current) {
        
        console.log("Call ended - sending message to group");
        callEndedMessageSent.current = true; // Set flag immediately
        
        try {
          const chatClient = StreamChat.getInstance(STREAM_API_KEY);
          const channelId = `group-${actualCallId}`;
          const channel = chatClient.channel("messaging", channelId);
          
          await channel.sendMessage({
            text: `📞 Group video call ended - All participants have left`
          });
          
          console.log("Call ended message sent successfully");
        } catch (error) {
          console.error("Failed to send call ended message:", error);
          callEndedMessageSent.current = false; // Reset on error
        }
      }

      lastParticipantCount.current = currentCount;
    };

    // Subscribe to participant changes
    const unsubscribe = call.state.participants$.subscribe(handleParticipantChange);

    // Initial count
    handleParticipantChange();

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [call, isGroupCall, actualCallId]);

  useEffect(() => {
    return () => {
      if (globalVideoClient) {
        setTimeout(() => {
          if (globalVideoClient) {
            console.log("Cleaning up global video client...");
            globalVideoClient.disconnectUser().catch(console.error);
            globalVideoClient = null;
          }
        }, 1000);
      }
    };
  }, []);

  if(isLoading || isConnecting) return <PageLoader />

  return (
    <div className='h-screen flex flex-col items-center justify-center'>
      <div className='relative w-full h-full'>
        {client && call ?(
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent 
                isGroupCall={isGroupCall} 
                actualCallId={actualCallId} 
                socket={socket}
                hasNotifiedJoin={hasNotifiedJoin}
                hasNotifiedLeave={hasNotifiedLeave}
              />
            </StreamCall>
          </StreamVideo>
        ):(
          <div className='flex items-center justify-center h-full'>
            <p> Could not initialize call. Please refresh or try again later.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const CallContent = ({ isGroupCall, actualCallId, socket, hasNotifiedJoin, hasNotifiedLeave })=>{
  const { useCallCallingState, useParticipantCount } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();

  // Show "call ended" only when there are 0 participants
  const noParticipants = isGroupCall && participantCount === 0;

  console.log("Participant count:", participantCount);

  // Simple end call function that notifies backend and closes window
  const handleEndCall = () => {
    console.log("🔴 End call button clicked - closing window");
    
    // Notify backend if it's a group call and we haven't already notified
    if (socket && isGroupCall && hasNotifiedJoin.current && !hasNotifiedLeave.current) {
      socket.emit('leave_call', { callId: actualCallId });
      hasNotifiedLeave.current = true;
      console.log(`🔔 Notified backend: User left call ${actualCallId}`);
    }
    
    // Close the window
    window.close();
  };

  return (
    <div className="relative w-full h-full">
      <StreamTheme>
        <SpeakerLayout/>
        
        {/* Custom Call Controls Container */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="flex items-center justify-center space-x-4">
            {/* Default Stream.io Call Controls */}
            <div className="flex items-center space-x-2">
              <CallControls />
            </div>
            
            {/* Custom End Call & Close Button */}
            <button
              onClick={handleEndCall}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium transition-colors duration-200 flex items-center space-x-2"
              title="End Call & Close Window"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>End & Close</span>
            </button>
          </div>
        </div>
        
        {/* Group call indicator with participant count */}
        {isGroupCall && (
          <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-sm z-20">
            Group Call ({participantCount} participants)
          </div>
        )}

        {/* Study session indicator */}
        {isGroupCall && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs z-20">
            📚 Study time tracked for call participants
          </div>
        )}

        {/* No participants message for group calls */}
        {noParticipants && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200 bg-opacity-90 z-30">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Group Video Call Ended</h2>
              <p className="text-gray-600 mb-6">All participants have left the call.</p>
              <button 
                onClick={handleEndCall}
                className="btn btn-primary"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </StreamTheme>
    </div>
  );
};

export default CallPage
