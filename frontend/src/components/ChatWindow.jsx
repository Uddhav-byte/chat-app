import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, messageService, roomService } from '../services/supabase';
import api from '../services/api';

const QUICK_PROMPTS = [
  '👋 Hello, testing the demo!',
  '🛠️ Tell me about the tech stack',
  '⚡ How does real-time messaging work?',
];

const BOT_RESPONSES = {
  stack: '🛠️ **Tech Stack**:\n• **Frontend**: React 19 + Vite deployed globally on Cloudflare Pages.\n• **Backend & DB**: Supabase (PostgreSQL with Row Level Security).\n• **Realtime**: WebSockets & Postgres Changes replication.\n• **Styling**: Vanilla CSS glassmorphism system with CSS custom properties.',
  architecture: '⚡ **Serverless Architecture**:\n• Global low-latency CDN delivery via Cloudflare Pages edge network.\n• Zero dedicated servers required to stay online 24/7.\n• Supabase handles authentication, session persistence, and instant WebSocket channels.',
  default: '👋 Hi there! Thanks for exploring Nexus Chat. This portfolio project demonstrates full-stack real-time engineering, responsive glassmorphic UI design, and serverless edge deployment.',
};

const ChatWindow = ({ room, onBack }) => {
  const { socket, user, isSupabase } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  const roomId = room?._id || room?.id;
  const isDemoMode = Boolean(user?.isDemo || String(roomId).startsWith('demo-'));

  useEffect(() => {
    if (!roomId) return;

    setMessages([]);
    setLoading(true);
    fetchMessages();

    if (isSupabase && supabase && user && !user?.isDemo && !String(roomId).startsWith('demo-')) {
      // 1. Join room
      roomService.joinRoom(roomId, user.id || user._id);

      // 2. Realtime channel for messages and typing indicators
      const channel = supabase.channel(`room:${roomId}`, {
        config: { broadcast: { self: false } },
      });

      realtimeChannelRef.current = channel;

      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            const row = payload.new;

            let senderProfile = null;
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .eq('id', row.sender_id)
                .maybeSingle();
              senderProfile = profile;
            } catch (err) {
              console.error('Error fetching sender profile:', err);
            }

            const formattedMsg = {
              _id: row.id,
              id: row.id,
              content: row.content,
              type: row.type || 'text',
              createdAt: row.created_at,
              room: row.room_id,
              sender: {
                _id: row.sender_id,
                id: row.sender_id,
                username: senderProfile?.username || (row.sender_id === (user.id || user._id) ? user.username : 'User'),
                avatar: senderProfile?.avatar_url || '',
              },
            };

            setMessages((prev) => {
              if (prev.some((m) => (m.id || m._id) === formattedMsg.id)) return prev;
              return [...prev, formattedMsg];
            });
          }
        )
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (!payload?.username || payload.username === user.username) return;

          setTypingUsers((prev) => {
            const next = new Set(prev);
            if (payload.isTyping) {
              next.add(payload.username);
            } else {
              next.delete(payload.username);
            }
            return next;
          });
        })
        .subscribe();

      return () => {
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
      };
    } else if (socket) {
      // Legacy Socket.io mode
      socket.emit('room:join', roomId);

      socket.on('message:new', (msg) => {
        if (msg.room === roomId) {
          setMessages((prev) => [...prev, msg]);
        }
      });

      socket.on('typing:update', ({ username, isTyping }) => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) {
            next.add(username);
          } else {
            next.delete(username);
          }
          return next;
        });
      });

      return () => {
        socket.emit('room:leave', roomId);
        socket.off('message:new');
        socket.off('typing:update');
      };
    }
  }, [roomId, isSupabase, user, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      if (isSupabase || isDemoMode) {
        const data = await messageService.getMessages(roomId);
        setMessages(data);
      } else {
        const { data } = await api.get(`/rooms/${roomId}/messages`);
        setMessages(data);
      }
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

    if (isSupabase && realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { username: user?.username || 'User', isTyping: true },
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        realtimeChannelRef.current?.send({
          type: 'broadcast',
          event: 'typing',
          payload: { username: user?.username || 'User', isTyping: false },
        });
      }, 1200);
    } else if (socket) {
      socket.emit('typing:start', { roomId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { roomId });
      }, 1000);
    }
  };

  const sendDirectMessage = async (text) => {
    const content = text.trim();
    if (!content) return;

    const userMessage = {
      _id: 'user-msg-' + Date.now(),
      id: 'user-msg-' + Date.now(),
      content: content,
      type: 'text',
      createdAt: new Date().toISOString(),
      room: roomId,
      sender: {
        _id: user?.id || user?._id || 'demo-user',
        id: user?.id || user?._id || 'demo-user',
        username: user?.username || 'You',
        avatar: '',
      },
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMessage]);

    if (isDemoMode) {
      // Simulate real-time bot response for demo experience
      setTimeout(() => {
        setTypingUsers((prev) => new Set(prev).add('Nexus Bot 🤖'));
      }, 600);

      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete('Nexus Bot 🤖');
          return next;
        });

        let botReply = BOT_RESPONSES.default;
        const lower = content.toLowerCase();
        if (lower.includes('tech') || lower.includes('stack')) {
          botReply = BOT_RESPONSES.stack;
        } else if (lower.includes('architecture') || lower.includes('serverless') || lower.includes('cloudflare')) {
          botReply = BOT_RESPONSES.architecture;
        } else if (lower.includes('hello') || lower.includes('hi')) {
          botReply = `👋 Hello ${user?.username || 'there'}! Wonderful to connect with you. Ask me about the tech stack, real-time architecture, or try creating a new room!`;
        }

        const botMessage = {
          _id: 'bot-msg-' + Date.now(),
          id: 'bot-msg-' + Date.now(),
          content: botReply,
          type: 'text',
          createdAt: new Date().toISOString(),
          room: roomId,
          sender: {
            _id: 'nexus-bot',
            id: 'nexus-bot',
            username: 'Nexus Bot 🤖',
            avatar: '',
          },
        };

        setMessages((prev) => [...prev, botMessage]);
      }, 1800);
    } else {
      try {
        await messageService.sendMessage(roomId, content, user.id || user._id);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const text = newMessage;
    setNewMessage('');
    await sendDirectMessage(text);
  };

  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const currentUserId = user?.id || user?._id;

  return (
    <div className="chat-area glass">
      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={onBack}
            style={{
              background: 'transparent',
              color: 'var(--text-main)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: window.innerWidth <= 768 ? 'block' : 'none',
            }}
          >
            ←
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>#{room?.name || 'chat-room'}</h2>
              {isDemoMode && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Interactive Demo
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
              {room?.description || `${room?.members?.length || 0} members`}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Loading messages...
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
                <p>No messages yet in <strong>#{room?.name}</strong>.</p>
                <p style={{ fontSize: '0.85rem' }}>Say hello to kick things off!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const senderId = msg.sender?._id || msg.sender?.id || msg.sender_id;
                const isSelf = senderId === currentUserId;
                const isSystem = msg.type === 'system';
                const isBot = msg.sender?.username?.includes('Nexus Bot');

                if (isSystem) {
                  return <div key={msg._id || msg.id || idx} className="message system">{msg.content}</div>;
                }

                return (
                  <div key={msg._id || msg.id || idx} className={`message ${isSelf ? 'self' : 'other'}`}>
                    {!isSelf && (
                      <div style={{
                        fontSize: '0.8rem',
                        color: isBot ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: isBot ? 600 : 400,
                        marginBottom: '0.2rem',
                        marginLeft: '0.5rem'
                      }}>
                        {msg.sender?.username || 'User'}
                      </div>
                    )}
                    <div className="message-bubble" style={{
                      whiteSpace: 'pre-line',
                      background: isBot ? 'rgba(99, 102, 241, 0.15)' : undefined,
                      border: isBot ? '1px solid rgba(99, 102, 241, 0.3)' : undefined,
                    }}>
                      {msg.content}
                    </div>
                    <div className="message-meta">{formatTime(msg.createdAt || msg.created_at || new Date())}</div>
                  </div>
                );
              })
            )}
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

      {/* Quick Prompts for Demo Mode */}
      {isDemoMode && (
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          padding: '0 1rem 0.5rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendDirectMessage(prompt)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-light)',
                borderRadius: '999px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-main)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border-light)';
              }}
            >
              {prompt}
            </button>
          ))}
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
            placeholder={`Message #${room?.name || 'room'}...`}
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
