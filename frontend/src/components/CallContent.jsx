
const CallContent = ({ isGroupCall })=>{
  const { useCallCallingState, useParticipantCount } = useCallStateHooks(); // Add useParticipantCount
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount(); // Get participant count using the hook

  const navigate = useNavigate();

  // Calculate if there are no other participants (only current user)
  const noParticipants = isGroupCall && participantCount <= 1;

  console.log("Participant count:", participantCount); // Debug log

  if(callingState === CallingState.LEFT) {
    if (globalVideoClient) {
      globalVideoClient.disconnectUser().catch(console.error);
      globalVideoClient = null;
    }
    return navigate("/")
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
              <p className="text-gray-600 mb-6">No other participants are currently in this call.</p>
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