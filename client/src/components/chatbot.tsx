import { useState, useEffect, useRef } from 'react';
import medievalRoomBackground from '../assets/tavern2.png';
import shield from '../assets/shield2.png';
import sword from '../assets/sword2.png';
import chat from '../assets/chat.png';

function usePrevious(value: boolean) {
  const ref = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export default function Test() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const prevLoading = usePrevious(loading);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 384, height: 500 });
  const [preFullScreenPosition, setPreFullScreenPosition] = useState(position);
  const [preFullScreenSize, setPreFullScreenSize] = useState(size);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let finalSize = size;
    const savedSize = localStorage.getItem('chatSize');
    if (savedSize) {
      finalSize = JSON.parse(savedSize);
      setSize(finalSize);
    } else {
      localStorage.setItem('chatSize', JSON.stringify(finalSize));
    }
    const savedPosition = localStorage.getItem('chatPosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      const defaultPos = {
        x: window.innerWidth - finalSize.width - 32,
        y: window.innerHeight - finalSize.height - 32,
      };
      setPosition(defaultPos);
      localStorage.setItem('chatPosition', JSON.stringify(defaultPos));
    }
  }, []);

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
    if (prevLoading && !loading && inputRef.current && isOpen) {
      inputRef.current.focus();
    }
  }, [messages, loading, prevLoading, isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const aiRes = await fetch('http://localhost:5001/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      if (!aiRes.ok) throw new Error(`AI request failed: ${aiRes.status}`);

      const aiData = await aiRes.json();
      const aiText = aiData.response;

      // Request both TTS and text together (concurrently)
      const ttsPromise = fetch('http://localhost:5001/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: aiText }),
      });

      const ttsRes = await ttsPromise;
      if (!ttsRes.ok) throw new Error('TTS fetch failed');

      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Both text + audio are now ready: stop thinking, show message, then play
      setLoading(false);
      const aiMessage: Message = { sender: 'ai', text: aiText };
      setMessages((prev) => [...prev, aiMessage]);

      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Message send failed:', error);
      const errorMessage: Message = {
        sender: 'ai',
        text: 'Sorry, something went wrong. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      setPreFullScreenPosition(position);
      setPreFullScreenSize(size);
    } else {
      setPosition(preFullScreenPosition);
      setSize(preFullScreenSize);
    }
    setIsFullScreen(!isFullScreen);
  };

  const handleOpenChat = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('User Data:', userData);
      } catch (e) {
        console.warn('Error parsing user data from localStorage.', e);
      }
    }
    setIsOpen(true);
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFullScreen) return;
    isDragging.current = true;
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    e.currentTarget.style.cursor = 'grabbing';
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging.current || isFullScreen) return;
    let newX = e.clientX - dragStartPos.current.x;
    let newY = e.clientY - dragStartPos.current.y;
    const maxX = window.innerWidth - size.width;
    const maxY = window.innerHeight - size.height;
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    localStorage.setItem('chatPosition', JSON.stringify(position));
  };

  const chatWindowStyle: React.CSSProperties = isFullScreen
    ? { position: 'fixed', width: '100vw', height: '100vh', left: 0, top: 0, zIndex: 1000 }
    : { position: 'fixed', width: `${size.width}px`, height: `${size.height}px`, left: `${position.x}px`, top: `${position.y}px`, zIndex: 1000 };

  const pixelFontStyle = {
    fontFamily: '"Press Start 2P", monospace',
    fontSmooth: 'never',
    WebkitFontSmoothing: 'none' as const,
  };

  return (
    <>
      {!isOpen && (
        <button
          className="cursor-pointer fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[rgba(154,52,18,1)] hover:bg-[rgba(154,52,18,0.9)] text-white shadow-lg flex items-center justify-center z-50"
          onClick={handleOpenChat}
        >
          <img src={chat} alt="Open Chat" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
        </button>
      )}

      {isOpen && (
        <div
          style={chatWindowStyle}
          className={`flex flex-col overflow-hidden bg-white shadow-xl ${isFullScreen ? 'rounded-none' : 'rounded-2xl'}`}
        >
          <div
            className={`text-white flex justify-between items-center p-3 ${!isFullScreen ? 'cursor-move' : ''}`}
            style={{
              backgroundColor: 'rgba(139, 69, 19, 0.3)',
              cursor: isDragging.current ? 'grabbing' : isFullScreen ? 'default' : 'move',
            }}
            onMouseDown={handleDragStart}
          >
            <span className="font-semibold" style={{ ...pixelFontStyle, fontSize: '1rem' }}>Chat</span>
            <div className="flex space-x-2">
              <button onClick={toggleFullScreen} className="hover:opacity-80 p-1" title={isFullScreen ? 'Minimize' : 'Fullscreen'}>
                {isFullScreen ? (
                  <img src={sword} alt="Minimize" className="w-10 h-7 cursor-pointer" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <img src={shield} alt="Fullscreen" className="w-10 h-7 cursor-pointer" style={{ imageRendering: 'pixelated' }} />
                )}
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:opacity-80 p-1" title="Close">
                ✕
              </button>
            </div>
          </div>

          <div
            ref={messageAreaRef}
            className="flex-1 overflow-y-auto p-3 space-y-3"
            style={{
              backgroundImage: `url(${medievalRoomBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#4a3d33',
            }}
          >
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-xs p-3 rounded-2xl text-white backdrop-blur-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-500/30 rounded-bl-none'
                      : 'bg-gray-700/30 rounded-br-none'
                  }`}
                  style={{ ...pixelFontStyle, fontSize: '0.65rem', lineHeight: '1.4' }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-end">
                <div
                  className="bg-gray-300 text-gray-800 p-3 rounded-2xl rounded-br-none"
                  style={{ ...pixelFontStyle, fontSize: '0.65rem' }}
                >
                  <div className="flex items-center space-x-2">
                    <span>Thinking</span>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t bg-white flex">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Type a message..."
              className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ ...pixelFontStyle, fontSize: '0.65rem' }}
            />
            {/* --- THIS BUTTON IS MODIFIED --- */}
            <button
              onClick={sendMessage}
              disabled={loading}
              className="ml-3 bg-[rgba(154,52,18,1)] text-white px-4 py-2 rounded-full hover:bg-[rgba(154,52,18,0.9)] disabled:bg-[rgba(154,52,18,0.5)]"
              style={{ ...pixelFontStyle, fontSize: '0.65rem' }}
            >
              Send
            </button>
            {/* --- END OF MODIFICATION --- */}
          </div>
        </div>
      )}

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .animate-bounce { animation: bounce 1s infinite; }
        `}
      </style>
    </>
  );
}