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

/**
 * Auth Services
 */
export const authService = {
  async register(username, email, password) {
    if (!supabase) throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) throw error;

    if (data?.user) {
      // Upsert profile in case database trigger has a slight delay
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username || email.split('@')[0],
        avatar_url: '',
      });
    }

    return data;
  },

  async login(email, password) {
    if (!supabase) throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async logout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    if (!supabase) return null;
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) return null;

    const user = session.user;
    // Fetch user's public profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return {
      id: user.id,
      _id: user.id,
      email: user.email,
      username: profile?.username || user.user_metadata?.username || user.email.split('@')[0],
      avatar: profile?.avatar_url || '',
    };
  },
};

/**
 * Room Services
 */
export const roomService = {
  async getRooms() {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('rooms')
      .select('*, creator:profiles(id, username), room_members(user_id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }

    return (data || []).map(room => ({
      _id: room.id,
      id: room.id,
      name: room.name,
      description: room.description,
      isPrivate: room.is_private,
      createdAt: room.created_at,
      creator: room.creator || { username: 'Unknown' },
      members: room.room_members?.map(m => m.user_id) || [],
    }));
  },

  async createRoom(name, description = '', userId) {
    if (!supabase) throw new Error('Supabase is not configured');

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

    // Automatically join the newly created room
    if (userId && data?.id) {
      await supabase.from('room_members').insert({
        room_id: data.id,
        user_id: userId,
      });
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
  },

  async joinRoom(roomId, userId) {
    if (!supabase || !userId) return;

    await supabase
      .from('room_members')
      .upsert({ room_id: roomId, user_id: userId }, { onConflict: 'room_id, user_id' });
  },
};

/**
 * Message Services
 */
export const messageService = {
  async getMessages(roomId) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, username, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
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
  },

  async sendMessage(roomId, content, userId) {
    if (!supabase) throw new Error('Supabase is not configured');

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
  },
};
