import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Default demo rooms for instant recruiter exploration
export const DEMO_ROOMS = [
  {
    _id: 'demo-room-general',
    id: 'demo-room-general',
    name: 'General',
    description: 'Welcome to Nexus Chat! Drop a message to test.',
    isPrivate: false,
    createdAt: new Date().toISOString(),
    creator: { username: 'Nexus Bot' },
    members: ['demo-user-123', 'nexus-bot'],
  },
  {
    _id: 'demo-room-recruiter',
    id: 'demo-room-recruiter',
    name: 'Recruiter Lounge',
    description: 'Tech stack details, architecture, and project highlights.',
    isPrivate: false,
    createdAt: new Date().toISOString(),
    creator: { username: 'Uddhav (Creator)' },
    members: ['demo-user-123', 'uddhav-creator'],
  },
  {
    _id: 'demo-room-tech',
    id: 'demo-room-tech',
    name: 'Tech Talk',
    description: 'React 19 + Supabase Realtime + Cloudflare Pages.',
    isPrivate: false,
    createdAt: new Date().toISOString(),
    creator: { username: 'Sarah Dev' },
    members: ['demo-user-123', 'sarah-dev'],
  },
];

// Preloaded demo messages
export const DEMO_MESSAGES = {
  'demo-room-general': [
    {
      _id: 'msg-1',
      id: 'msg-1',
      content: '👋 Welcome to the live demo of Nexus Chat!',
      type: 'text',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      room: 'demo-room-general',
      sender: {
        _id: 'nexus-bot',
        id: 'nexus-bot',
        username: 'Nexus Bot 🤖',
        avatar: '',
      },
    },
    {
      _id: 'msg-2',
      id: 'msg-2',
      content: 'You can test sending messages, switching rooms, and creating new channels right here.',
      type: 'text',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      room: 'demo-room-general',
      sender: {
        _id: 'nexus-bot',
        id: 'nexus-bot',
        username: 'Nexus Bot 🤖',
        avatar: '',
      },
    },
  ],
  'demo-room-recruiter': [
    {
      _id: 'msg-recruiter-1',
      id: 'msg-recruiter-1',
      content: 'Hello and welcome! Thank you for reviewing my chat application portfolio project.',
      type: 'text',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      room: 'demo-room-recruiter',
      sender: {
        _id: 'uddhav-creator',
        id: 'uddhav-creator',
        username: 'Uddhav (Creator)',
        avatar: '',
      },
    },
    {
      _id: 'msg-recruiter-2',
      id: 'msg-recruiter-2',
      content: '⚡ Architecture Highlights:\n• Frontend: React 19 + Vite deployed to Cloudflare Pages edge CDN.\n• Realtime & DB: Supabase (PostgreSQL, Realtime replication & Presence).\n• Security: Row Level Security (RLS) policies.',
      type: 'text',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      room: 'demo-room-recruiter',
      sender: {
        _id: 'nexus-bot',
        id: 'nexus-bot',
        username: 'Nexus Bot 🤖',
        avatar: '',
      },
    },
  ],
  'demo-room-tech': [
    {
      _id: 'msg-tech-1',
      id: 'msg-tech-1',
      content: 'This app is 100% serverless! No dedicated Node container is needed to keep it alive 24/7.',
      type: 'text',
      createdAt: new Date(Date.now() - 5400000).toISOString(),
      room: 'demo-room-tech',
      sender: {
        _id: 'sarah-dev',
        id: 'sarah-dev',
        username: 'Sarah Dev',
        avatar: '',
      },
    },
  ],
};

/**
 * Auth Services
 */
export const authService = {
  async register(username, email, password) {
    if (!supabase) throw new Error('Supabase is not configured.');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) throw error;

    if (data?.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: username || email.split('@')[0],
          avatar_url: '',
        });
      } catch (err) {
        console.warn('Profile upsert notice:', err);
      }
    }

    return data;
  },

  async login(email, password) {
    if (!supabase) throw new Error('Supabase is not configured.');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async logout() {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
  },

  async getCurrentUser() {
    if (!supabase) return null;
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) return null;

      const user = session.user;
      let profile = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        profile = data;
      } catch (err) {
        console.warn('Profile fetch notice:', err);
      }

      return {
        id: user.id,
        _id: user.id,
        email: user.email,
        username: profile?.username || user.user_metadata?.username || user.email.split('@')[0],
        avatar: profile?.avatar_url || '',
      };
    } catch {
      return null;
    }
  },
};

/**
 * Room Services
 */
export const roomService = {
  async getRooms() {
    if (!supabase) return DEMO_ROOMS;
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, creator:profiles(id, username), room_members(user_id)')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // Graceful fallback to demo rooms if tables are pending or empty
        return DEMO_ROOMS;
      }

      return data.map(room => ({
        _id: room.id,
        id: room.id,
        name: room.name,
        description: room.description,
        isPrivate: room.is_private,
        createdAt: room.created_at,
        creator: room.creator || { username: 'Unknown' },
        members: room.room_members?.map(m => m.user_id) || [],
      }));
    } catch (error) {
      console.warn('Rooms fetch fallback to demo rooms:', error);
      return DEMO_ROOMS;
    }
  },

  async createRoom(name, description = '', userId) {
    if (!supabase) {
      const newRoom = {
        _id: 'demo-' + Date.now(),
        id: 'demo-' + Date.now(),
        name: name.trim(),
        description: description.trim(),
        isPrivate: false,
        createdAt: new Date().toISOString(),
        creator: { username: 'You' },
        members: [userId || 'demo-user'],
      };
      DEMO_ROOMS.unshift(newRoom);
      return newRoom;
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: name.trim(),
          description: description.trim(),
          created_by: userId,
        })
        .select('*, creator:profiles(id, username)')
        .single();

      if (error) throw error;

      if (userId && data?.id) {
        try {
          await supabase.from('room_members').insert({
            room_id: data.id,
            user_id: userId,
          });
        } catch (e) {
          console.warn('Room member join notice:', e);
        }
      }

      return {
        _id: data.id,
        id: data.id,
        name: data.name,
        description: data.description,
        isPrivate: data.is_private,
        createdAt: data.created_at,
        creator: data.creator || { username: 'You' },
        members: [userId],
      };
    } catch (err) {
      console.warn('Room creation fallback to local demo room:', err);
      const newRoom = {
        _id: 'demo-' + Date.now(),
        id: 'demo-' + Date.now(),
        name: name.trim(),
        description: description.trim(),
        isPrivate: false,
        createdAt: new Date().toISOString(),
        creator: { username: 'You' },
        members: [userId || 'demo-user'],
      };
      DEMO_ROOMS.unshift(newRoom);
      return newRoom;
    }
  },

  async joinRoom(roomId, userId) {
    if (!supabase || !userId || String(roomId).startsWith('demo-')) return;

    try {
      await supabase
        .from('room_members')
        .upsert({ room_id: roomId, user_id: userId }, { onConflict: 'room_id, user_id' });
    } catch (err) {
      console.warn('Room join notice:', err);
    }
  },
};

/**
 * Message Services
 */
export const messageService = {
  async getMessages(roomId) {
    if (!supabase || String(roomId).startsWith('demo-')) {
      return DEMO_MESSAGES[roomId] || [];
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, username, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error fetching messages, using demo fallback:', error);
        return DEMO_MESSAGES[roomId] || [];
      }

      return (data || []).map(msg => ({
        _id: msg.id,
        id: msg.id,
        content: msg.content,
        type: msg.type || 'text',
        createdAt: msg.created_at,
        room: msg.room_id,
        sender: {
          _id: msg.sender?.id || msg.sender_id,
          id: msg.sender?.id || msg.sender_id,
          username: msg.sender?.username || 'User',
          avatar: msg.sender?.avatar_url || '',
        },
      }));
    } catch (error) {
      console.warn('Messages fallback:', error);
      return DEMO_MESSAGES[roomId] || [];
    }
  },

  async sendMessage(roomId, content, userId) {
    if (!supabase || String(roomId).startsWith('demo-')) {
      const demoMsg = {
        _id: 'msg-' + Date.now(),
        id: 'msg-' + Date.now(),
        content: content.trim(),
        type: 'text',
        createdAt: new Date().toISOString(),
        room: roomId,
        sender: {
          _id: userId || 'demo-user',
          id: userId || 'demo-user',
          username: 'You',
          avatar: '',
        },
      };
      if (!DEMO_MESSAGES[roomId]) DEMO_MESSAGES[roomId] = [];
      DEMO_MESSAGES[roomId].push(demoMsg);
      return demoMsg;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: userId,
          content: content.trim(),
          type: 'text',
        })
        .select('*, sender:profiles(id, username, avatar_url)')
        .single();

      if (error) throw error;

      return {
        _id: data.id,
        id: data.id,
        content: data.content,
        type: data.type || 'text',
        createdAt: data.created_at,
        room: data.room_id,
        sender: {
          _id: data.sender?.id || data.sender_id,
          id: data.sender?.id || data.sender_id,
          username: data.sender?.username || 'User',
          avatar: data.sender?.avatar_url || '',
        },
      };
    } catch (err) {
      console.warn('Send message fallback to demo:', err);
      const demoMsg = {
        _id: 'msg-' + Date.now(),
        id: 'msg-' + Date.now(),
        content: content.trim(),
        type: 'text',
        createdAt: new Date().toISOString(),
        room: roomId,
        sender: {
          _id: userId || 'demo-user',
          id: userId || 'demo-user',
          username: 'You',
          avatar: '',
        },
      };
      if (!DEMO_MESSAGES[roomId]) DEMO_MESSAGES[roomId] = [];
      DEMO_MESSAGES[roomId].push(demoMsg);
      return demoMsg;
    }
  },
};
