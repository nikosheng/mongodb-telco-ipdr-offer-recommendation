import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage } from '../services/api';

const assistantComponents = {
  // Table styles
  table: ({node, ...props}) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white" {...props} />
    </div>
  ),
  thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
  th: ({node, ...props}) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" {...props} />
  ),
  tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
  tr: ({node, ...props}) => <tr className="hover:bg-gray-50 transition-colors" {...props} />,
  td: ({node, ...props}) => <td className="px-3 py-2 text-xs text-gray-700 whitespace-normal break-words" {...props} />,
  
  // Text styles
  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
  strong: ({node, ...props}) => <span className="font-bold text-blue-700" {...props} />,
  em: ({node, ...props}) => <span className="italic text-gray-600" {...props} />,
  
  // List styles
  ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 space-y-1 my-2 text-gray-700" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 space-y-1 my-2 text-gray-700" {...props} />,
  li: ({node, ...props}) => <li className="pl-1" {...props} />,
  
  // Code styles
  code: ({node, inline, className, children, ...props}) => {
    return inline 
      ? <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono border border-gray-200" {...props}>{children}</code>
      : <div className="mockup-code bg-gray-900 text-gray-100 rounded-lg overflow-hidden my-2 shadow-md">
          <pre className="p-3 overflow-x-auto text-xs"><code {...props}>{children}</code></pre>
        </div>
  },
  
  // Blockquote
  blockquote: ({node, ...props}) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50 text-gray-700 italic rounded-r text-xs shadow-sm" {...props} />
  ),

  // Headings
  h1: ({node, ...props}) => <h1 className="text-lg font-bold my-3 text-gray-900 border-b pb-1" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-md font-bold my-2 text-gray-800" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-sm font-bold my-2 text-gray-800" {...props} />,
  
  // Links
  a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-800 transition-all" target="_blank" rel="noopener noreferrer" {...props} />,
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help you with user info, offers, and recommendations. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare context for the API
      // We send the full history for context
      const response = await sendChatMessage([...messages, userMessage]);
      
      const assistantMessage = { 
        role: 'assistant', 
        content: response.data.content 
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[2000] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[520px] md:w-[640px] h-[700px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white font-semibold flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-base">Telco AI Assistant</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700 p-1.5 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1 shrink-0 border border-blue-200">
                    <span className="text-xs font-bold text-blue-600">AI</span>
                  </div>
                )}
                <div 
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                  }`}
                >
                  <div className={`text-[15px] leading-relaxed max-w-none ${
                    msg.role === 'user' 
                      ? 'prose prose-sm prose-invert text-white' 
                      : 'text-gray-800'
                  }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={msg.role === 'assistant' ? assistantComponents : undefined}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center mr-3 shrink-0">
                  <span className="text-xs font-bold text-blue-600 animate-pulse">AI</span>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button 
                type="submit"
                disabled={isLoading}
                className={`px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ➤
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-all transform hover:scale-105"
      >
        {isOpen ? (
          <span className="text-2xl">✕</span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
