import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

const Chat = () => {
  const { socket, user } = useAuth();
  const [activeRoom, setActiveRoom] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);

  // If on mobile and a room is selected, hide sidebar
  useEffect(() => {
    if (activeRoom && window.innerWidth <= 768) {
      setIsMobileSidebarOpen(false);
    }
  }, [activeRoom]);

  const handleBackToRooms = () => {
    setIsMobileSidebarOpen(true);
    setActiveRoom(null);
  };

  return (
    <div className="app-container">
      {/* Sidebar - Shows on desktop or when mobile sidebar is open */}
      {(isMobileSidebarOpen || window.innerWidth > 768) && (
        <Sidebar activeRoom={activeRoom} setActiveRoom={setActiveRoom} />
      )}

      {/* Chat Area - Shows when a room is selected or on desktop */}
      {activeRoom ? (
        <ChatWindow 
          room={activeRoom} 
          onBack={handleBackToRooms} 
        />
      ) : (
        <div className="chat-area glass" style={{ display: isMobileSidebarOpen && window.innerWidth <= 768 ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center">
            <div className="avatar" style={{ width: 80, height: 80, margin: '0 auto 1rem', fontSize: '2rem' }}>
              💬
            </div>
            <h2 className="auth-title">Nexus Chat</h2>
            <p className="auth-subtitle">Select a room to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
