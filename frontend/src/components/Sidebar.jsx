import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, roomService, isSupabaseConfigured } from '../services/supabase';
import api from '../services/api';
import RoomCard from './RoomCard';

const Sidebar = ({ activeRoom, setActiveRoom }) => {
  const { user, logout, socket, isSupabase } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    fetchRooms();

    if (isSupabase && supabase && user) {
      // 1. Listen for new/updated rooms via Supabase Postgres Changes
      const roomChannel = supabase
        .channel('public:rooms')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms' },
          () => {
            fetchRooms();
          }
        )
        .subscribe();

      // 2. Track Online Presence across the app
      const presenceChannel = supabase.channel('online-presence', {
        config: {
          presence: { key: user.id || user._id },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const onlineList = [];
          Object.values(state).forEach((presences) => {
            presences.forEach((p) => {
              if (p?.username && !onlineList.some((u) => u.userId === p.userId)) {
                onlineList.push({ userId: p.userId, username: p.username });
              }
            });
          });
          setOnlineUsers(onlineList);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              userId: user.id || user._id,
              username: user.username,
              onlineAt: new Date().toISOString(),
            });
          }
        });

      return () => {
        supabase.removeChannel(roomChannel);
        supabase.removeChannel(presenceChannel);
      };
    } else if (socket) {
      // Legacy Socket.io mode
      socket.on('room:updated', (updatedRoom) => {
        setRooms((prev) => prev.map((r) => (r._id === updatedRoom._id ? updatedRoom : r)));
      });

      socket.on('users:online', (users) => {
        setOnlineUsers(users);
      });

      return () => {
        socket.off('room:updated');
        socket.off('users:online');
      };
    }
  }, [socket, isSupabase, user]);

  const fetchRooms = async () => {
    try {
      if (isSupabase) {
        const data = await roomService.getRooms();
        setRooms(data);
        // Automatically select first room if none selected
        if (!activeRoom && data.length > 0) {
          setActiveRoom(data[0]);
        }
      } else {
        const { data } = await api.get('/rooms');
        setRooms(data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms', error);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      if (isSupabase) {
        const newRoom = await roomService.createRoom(newRoomName, '', user.id || user._id);
        setRooms((prev) => [newRoom, ...prev.filter((r) => r.id !== newRoom.id)]);
        setActiveRoom(newRoom);
      } else {
        const { data } = await api.post('/rooms', { name: newRoomName });
        setRooms([data, ...rooms]);
        setActiveRoom(data);
      }
      setNewRoomName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create room', error);
      alert(error.message || 'Failed to create room. It may already exist.');
    }
  };

  const usernameInitial = user?.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <div className="sidebar glass">
      <div className="sidebar-header">
        <h2 className="sidebar-title" style={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Nexus <span style={{ color: 'var(--primary)' }}>Chat</span>
        </h2>
      </div>

      <div className="sidebar-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rooms ({rooms.length})
          </h3>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            style={{ background: 'transparent', color: 'var(--primary)', padding: '0.2rem', cursor: 'pointer' }}
          >
            {isCreating ? '✕' : '＋ New'}
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateRoom} style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              className="input-field"
              style={{ padding: '0.5rem', fontSize: '0.9rem', marginBottom: '0.5rem' }}
              placeholder="Room name..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
              Create Room
            </button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {rooms.map((room) => {
            const roomId = room._id || room.id;
            const currentActiveId = activeRoom?._id || activeRoom?.id;
            return (
              <RoomCard
                key={roomId}
                room={room}
                isActive={currentActiveId === roomId}
                onClick={() => setActiveRoom(room)}
              />
            );
          })}
          {rooms.length === 0 && !isCreating && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
              No rooms yet. Create one!
            </p>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="avatar">
          {usernameInitial}
          <div className="online-indicator"></div>
        </div>
        <div className="item-info">
          <div className="item-name">{user?.username || 'Guest'}</div>
          <div className="item-sub" style={{ color: 'var(--success)' }}>
            Online ({Math.max(onlineUsers.length, 1)})
          </div>
        </div>
        <button 
          onClick={logout}
          style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
          title="Logout"
        >
          ⎋
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
