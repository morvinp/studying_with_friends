import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { chatWithAI } from '../lib/api';

const AIChatModal = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

    const parseMessage = (content) => {
    // Split by triple backticks
    const parts = content.split(/```/);

    return parts.map((part, index) => {
        if (index % 2 === 1) {
        // Code block
        const lines = part.split('\n');
        const language = lines[0]?.trim() || '';
        const code = lines.slice(1).join('\n').trim();

        return (
            <div key={index} className="my-3 border border-base-300 rounded-lg overflow-hidden">
            {language && (
                <div className="bg-base-300 px-3 py-2 text-xs font-mono border-b border-base-300 text-base-content opacity-70">
                {language}
                </div>
            )}
            <pre className="bg-base-200 p-4 overflow-x-auto text-sm">
                <code className="font-mono text-base-content whitespace-pre-wrap">{code}</code>
            </pre>
            </div>
        );
        } else {
        // Regular text with inline formatting
        let textContent = part;

        // Handle inline code with single backticks
        textContent = textContent.replace(/`([^`]+)`/g,
            '<code class="bg-base-300 px-1 py-0.5 rounded text-sm font-mono">$1</code>'
        );

        // Handle bold text
        textContent = textContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Handle line breaks
        textContent = textContent.replace(/\n/g, '<br/>');

        return (
            <span key={index} dangerouslySetInnerHTML={{ __html: textContent }} />
        );
        }
    });
    };



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const userMessage = {
      content: newMessage,
      isAI: false,
      timestamp: new Date(),
      _id: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const data = await chatWithAI(newMessage.trim(), conversationId);

      if (data.success) {
        setConversationId(data.conversationId);
        const aiMessage = {
          content: data.aiMessage.text || data.aiMessage.content || 'No response',
          isAI: true,
          timestamp: new Date(),
          _id: data.aiMessage._id
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.message || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      
      const errorMessage = {
        content: 'Sorry, I encountered an error. Please try again.',
        isAI: true,
        timestamp: new Date(),
        _id: Date.now() + 1
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className={`bg-base-100 rounded-lg shadow-xl border border-base-300 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-full max-w-2xl h-[600px]'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300 bg-primary text-primary-content rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="w-8 h-8 rounded-full bg-primary-content text-primary flex items-center justify-center">
                <Bot size={18} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs opacity-80">Powered by Google Gemini</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="btn btn-sm btn-ghost btn-circle text-primary-content"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="btn btn-sm btn-ghost btn-circle text-primary-content"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[460px]">
              {messages.length === 0 && (
                <div className="text-center text-base-content opacity-50 mt-20">
                  <Bot size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Hello! I'm your AI assistant.</p>
                  <p className="text-sm mt-2">How can I help you today?</p>
                  <div className="mt-4 text-xs">
                    <p>💡 I can help with:</p>
                    <p>• Answering questions • Explaining concepts • Writing assistance</p>
                  </div>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`chat ${message.isAI ? 'chat-start' : 'chat-end'}`}
                >
                  <div className="chat-image avatar">
                    <div className="w-8 h-8 rounded-full">
                      {message.isAI ? (
                        <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full">
                          <Bot size={16} />
                        </div>
                      ) : (
                        <div className="bg-secondary text-secondary-content flex items-center justify-center w-full h-full rounded-full">
                          <User size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="chat-header text-xs opacity-50 mb-1">
                    {message.isAI ? 'AI Assistant' : 'You'}
                    <time className="ml-2">
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>
                  <div className={`chat-bubble ${
                    message.isAI ? 'chat-bubble-primary' : 'chat-bubble-secondary'
                  }`}>
                    {message.isAI ? (
                      <div className="space-y-1 leading-relaxed">
                        {parseMessage(message.content)}
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="chat chat-start">
                  <div className="chat-image avatar">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                  </div>
                  <div className="chat-bubble bg-base-300 text-base-content">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-xs">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 bg-base-200 border-t border-base-300 rounded-b-lg">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask me anything..."
                  className="input input-bordered flex-1"
                  disabled={isLoading}
                  maxLength={1000}
                />
                <button
                  type="submit"
                  disabled={isLoading || !newMessage.trim()}
                  className="btn btn-primary"
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
              
              {newMessage.length > 800 && (
                <div className="text-xs text-base-content opacity-50 mt-1 text-right">
                  {newMessage.length}/1000
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AIChatModal;
