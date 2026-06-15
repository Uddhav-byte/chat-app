import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ChatWindow = ({ room, onBack }) => {
  const { socket, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    fetchMessages();

    if (socket) {
      socket.emit('room:join', room._id);

      socket.on('message:new', (msg) => {
        if (msg.room === room._id) {
          setMessages(prev => [...prev, msg]);
        }
      });

      socket.on('typing:update', ({ userId, username, isTyping }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(username);
          } else {
            newSet.delete(username);
          }
          return newSet;
        });
      });
    }

    return () => {
      if (socket) {
        socket.emit('room:leave', room._id);
        socket.off('message:new');
        socket.off('typing:update');
      }
    };
  }, [room._id, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get(`/rooms/${room._id}/messages`);
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (socket) {
      socket.emit('typing:start', { roomId: room._id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { roomId: room._id });
      }, 1000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('message:send', {
      roomId: room._id,
      content: newMessage,
    });
    
    socket.emit('typing:stop', { roomId: room._id });
    setNewMessage('');
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-area glass">
      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={onBack}
            style={{ background: 'transparent', color: 'var(--text-main)', fontSize: '1.2rem', display: window.innerWidth <= 768 ? 'block' : 'none' }}
          >
            ←
          </button>
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{room.name}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {room.members?.length || 0} members
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading messages...</div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isSelf = msg.sender._id === user._id;
              const isSystem = msg.type === 'system';

              if (isSystem) {
                return <div key={msg._id || idx} className="message system">{msg.content}</div>;
              }

              return (
                <div key={msg._id || idx} className={`message ${isSelf ? 'self' : 'other'}`}>
                  {!isSelf && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>{msg.sender.username}</div>}
                  <div className="message-bubble">{msg.content}</div>
                  <div className="message-meta">{formatTime(msg.createdAt || new Date())}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div style={{ padding: '0 1.5rem 0.5rem', fontSize: '0.8rem', color: 'var(--primary)', fontStyle: 'italic' }}>
          {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="input-field"
            value={newMessage}
            onChange={handleTyping}
            placeholder={`Message ${room.name}...`}
            style={{ flex: 1 }}
          />
          <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
            ➤
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
