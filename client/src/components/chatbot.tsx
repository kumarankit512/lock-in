import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";

interface Message {
  sender: "user" | "ai";
  text: string;
}

export default function Test() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 384, height: 500 });

  const [preFullScreenPosition, setPreFullScreenPosition] = useState(position);
  const [preFullScreenSize, setPreFullScreenSize] = useState(size);

  useEffect(() => {
    let finalSize = size;
    const savedSize = localStorage.getItem("chatSize");

    if (savedSize) {
      finalSize = JSON.parse(savedSize);
      setSize(finalSize);
    } else {
      localStorage.setItem("chatSize", JSON.stringify(finalSize));
    }

    const savedPosition = localStorage.getItem("chatPosition");
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      const defaultPos = {
        x: window.innerWidth - finalSize.width - 32,
        y: window.innerHeight - 100,
      };
      setPosition(defaultPos);
      localStorage.setItem("chatPosition", JSON.stringify(defaultPos));
    }
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      const aiMessage: Message = { sender: "ai", text: data.response };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      const errorMessage: Message = {
        sender: "ai",
        text: "Sorry, something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      setPreFullScreenPosition(position);
      setPreFullScreenSize(size);
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setPosition({ x: 0, y: 0 });
    } else {
      setPosition(preFullScreenPosition);
      setSize(preFullScreenSize);
    }
    setIsFullScreen(!isFullScreen);
  };

  const handleOpenChat = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = {
        username: JSON.parse(storedUser).username,
        email: JSON.parse(storedUser).email,
      };
      console.log("User Data:", userData);
    } else {
      console.warn("No user found in localStorage.");
    }
    setIsOpen(true);
  };

  return (
    <>
      {!isOpen && (
        <button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 flex items-center justify-center z-50"
          onClick={handleOpenChat}
        >
          💬
        </button>
      )}

      {isOpen && (
        <Rnd
          size={{ width: size.width, height: size.height }}
          position={{ x: position.x, y: position.y }}
          onDragStop={(e, d) => {
            setPosition({ x: d.x, y: d.y });
            localStorage.setItem("chatPosition", JSON.stringify({ x: d.x, y: d.y }));
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
            const newSize = { width: ref.offsetWidth, height: ref.offsetHeight };
            setSize(newSize);
            setPosition(position);
            localStorage.setItem("chatSize", JSON.stringify(newSize));
            localStorage.setItem("chatPosition", JSON.stringify(position));
          }}
          bounds="window"
          minWidth={300}
          minHeight={300}
          enableResizing={!isFullScreen}
          dragHandleClassName="chat-header"
        >
          <div
            className={`flex flex-col overflow-hidden bg-white shadow-xl rounded-2xl ${isFullScreen ? "rounded-none" : ""}`}
            style={{ width: "100%", height: "100%" }}
          >
            <div className="chat-header bg-blue-500 text-white flex justify-between items-center p-3 cursor-move">
              <span>Chat</span>
              <div className="flex space-x-2">
                <button onClick={toggleFullScreen} className="hover:opacity-80">
                  {isFullScreen ? "🗗" : "⛶"}
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:opacity-80">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-100">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-xs p-3 rounded-2xl text-white ${
                      msg.sender === "user"
                        ? "bg-blue-500 rounded-bl-none"
                        : "bg-gray-700 rounded-br-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-end">
                  <div className="bg-gray-300 text-gray-800 p-3 rounded-2xl rounded-br-none">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t bg-white flex">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Type a message..."
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="ml-3 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
              >
                Send
              </button>
            </div>
          </div>
        </Rnd>
      )}
    </>
  );
}
