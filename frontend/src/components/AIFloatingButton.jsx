import { useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';

const AIFloatingButton = ({ onOpenChat }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onOpenChat}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-50 group"
      title="Chat with AI Assistant"
    >
      <Bot size={24} className={`transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`} />
      
      {/* Pulse animation */}
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap">
          AI Assistant
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </button>
  );
};

export default AIFloatingButton;
