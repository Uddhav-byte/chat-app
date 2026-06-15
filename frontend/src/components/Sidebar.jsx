import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import RoomCard from './RoomCard';

const Sidebar = ({ activeRoom, setActiveRoom }) => {
  const { user, logout, socket } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    fetchRooms();

    if (socket) {
      socket.on('room:updated', (updatedRoom) => {
        setRooms(prev => prev.map(r => r._id === updatedRoom._id ? updatedRoom : r));
      });

      socket.on('users:online', (users) => {
        setOnlineUsers(users);
      });
    }

    return () => {
      if (socket) {
        socket.off('room:updated');
        socket.off('users:online');
      }
    };
  }, [socket]);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms');
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms', error);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const { data } = await api.post('/rooms', { name: newRoomName });
      setRooms([data, ...rooms]);
      setNewRoomName('');
      setIsCreating(false);
      setActiveRoom(data);
    } catch (error) {
      console.error('Failed to create room', error);
    }
  };

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
            style={{ background: 'transparent', color: 'var(--primary)', padding: '0.2rem' }}
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
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
              Create Room
            </button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {rooms.map((room) => (
            <RoomCard
              key={room._id}
              room={room}
              isActive={activeRoom?._id === room._id}
              onClick={() => setActiveRoom(room)}
            />
          ))}
          {rooms.length === 0 && !isCreating && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
              No rooms yet. Create one!
            </p>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="avatar">
          {user.username.charAt(0).toUpperCase()}
          <div className="online-indicator"></div>
        </div>
        <div className="item-info">
          <div className="item-name">{user.username}</div>
          <div className="item-sub" style={{ color: 'var(--success)' }}>Online ({onlineUsers.length})</div>
        </div>
        <button 
          onClick={logout}
          style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '1.2rem' }}
          title="Logout"
        >
          ⎋
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
