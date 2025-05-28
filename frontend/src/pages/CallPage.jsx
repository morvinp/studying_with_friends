import React, { useEffect, useState, useRef } from 'react' // Add useRef to imports
import { useNavigate, useParams } from 'react-router'
import useAuthUser from '../hooks/useAuthUser';
import { useQuery } from '@tanstack/react-query';
import { getStreamToken } from '../lib/api';
import { StreamChat } from 'stream-chat'; // Add this import

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks, // Make sure this is imported
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from 'react-hot-toast';
import PageLoader from '../components/PageLoader';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY

// Global client instance to prevent duplicates
let globalVideoClient = null;

const CallPage = () => {
  const {id: callId} = useParams();

  // Detect if this is a group call
  const isGroupCall = callId?.startsWith('group-');
  const actualCallId = isGroupCall ? callId.replace('group-', '') : callId;

  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const {authUser, isLoading} = useAuthUser();

  // Add useRef for state management
  const callEndedMessageSent = useRef(false);
  const lastParticipantCount = useRef(0);
  const hasHadParticipants = useRef(false);

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
      }
    };
  },[tokenData, authUser, actualCallId]);

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
              <CallContent isGroupCall={isGroupCall}/>
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

const CallContent = ({ isGroupCall })=>{
  const { useCallCallingState, useParticipantCount } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();

  const navigate = useNavigate();

  // Show "call ended" only when there are 0 participants
  const noParticipants = isGroupCall && participantCount === 0;

  console.log("Participant count:", participantCount);

  if(callingState === CallingState.LEFT) {
    if (globalVideoClient) {
      globalVideoClient.disconnectUser().catch(console.error);
      globalVideoClient = null;
    }
    return navigate(-1)
  }

  return (
    <div className="relative w-full h-full">
      <StreamTheme>
        <SpeakerLayout/>
        <CallControls/>
        
        {/* Group call indicator with participant count */}
        {isGroupCall && (
          <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-sm z-20">
            Group Call ({participantCount} participants)
          </div>
        )}

        {/* No participants message for group calls */}
        {noParticipants && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200 bg-opacity-90 z-30">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Group Video Call Ended</h2>
              <p className="text-gray-600 mb-6">All participants have left the call.</p>
              <button 
                onClick={() => navigate(-1)} 
                className="btn btn-primary"
              >
                Back to Chat
              </button>
            </div>
          </div>
        )}
      </StreamTheme>
    </div>
  );
};

export default CallPage
