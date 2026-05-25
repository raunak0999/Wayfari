import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const ChatContext = createContext(null);

const CONVOS_KEY = 'wayfari_conversations';
const MSGS_KEY = 'wayfari_messages';

const isSupabaseConfigured = () => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return key && key !== 'PASTE_YOUR_ANON_KEY_HERE' && key.length > 20;
};

const getStoredConvos = () => {
  try { return JSON.parse(localStorage.getItem(CONVOS_KEY)) || []; }
  catch { return []; }
};

const getStoredMessages = () => {
  try { return JSON.parse(localStorage.getItem(MSGS_KEY)) || {}; }
  catch { return {}; }
};

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [activeConvoId, setActiveConvoId] = useState(null);
  const activeConvoIdRef = useRef(null);
  const useSupabase = isSupabaseConfigured();

  // Keep ref in sync
  useEffect(() => {
    activeConvoIdRef.current = activeConvoId;
  }, [activeConvoId]);

  // ── Persist to localStorage ──
  const saveConvos = useCallback((convos) => {
    localStorage.setItem(CONVOS_KEY, JSON.stringify(convos));
  }, []);

  const saveMsgs = useCallback((msgs) => {
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
  }, []);

  // ── Load on init ──
  const loadConversations = useCallback(async () => {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_time', { ascending: false });

      if (data && !error) {
        const mapped = data.map(c => ({
          ...c,
          buddyName: c.buddy_name || c.buddyName || 'Buddy',
          buddyAvatar: c.buddy_avatar || c.buddyAvatar || null,
          lastMessage: c.last_message || '',
          lastMessageTime: c.last_message_time,
          unreadCount: c.unread_count || 0,
          participants: [c.participant_1, c.participant_2],
        }));
        setConversations(mapped);
        return;
      }
    }
    // Local fallback
    setConversations(getStoredConvos());
  }, [useSupabase]);

  const loadMessages = useCallback(async (convoId) => {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });

      if (data && !error) {
        const mapped = data.map(m => ({
          ...m,
          senderId: m.sender_id,
          timestamp: m.created_at,
        }));
        setMessages(prev => ({ ...prev, [convoId]: mapped }));
        return;
      }
    }
    // Local — already in state from init
  }, [useSupabase]);

  useEffect(() => {
    loadConversations();
    // Load stored messages locally
    if (!useSupabase) {
      setMessages(getStoredMessages());
    }

    if (useSupabase) {
      const msgSub = supabase
        .channel('messages-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          const newMsg = {
            ...payload.new,
            senderId: payload.new.sender_id,
            timestamp: payload.new.created_at,
          };
          setMessages(prev => ({
            ...prev,
            [newMsg.conversation_id]: [...(prev[newMsg.conversation_id] || []), newMsg]
          }));
          loadConversations();
        })
        .subscribe();

      return () => { supabase.removeChannel(msgSub); };
    }
  }, [loadConversations, useSupabase]);

  // ── Save when state changes ──
  useEffect(() => {
    if (!useSupabase && conversations.length > 0) {
      saveConvos(conversations);
    }
  }, [conversations, useSupabase, saveConvos]);

  useEffect(() => {
    if (!useSupabase && Object.keys(messages).length > 0) {
      saveMsgs(messages);
    }
  }, [messages, useSupabase, saveMsgs]);

  // ── Get or Create Conversation ──
  const getOrCreateConversation = useCallback(async (userId, buddyId, buddyName, buddyAvatar) => {
    // Check existing
    const existing = conversations.find(c =>
      (c.participant_1 === userId && c.participant_2 === buddyId) ||
      (c.participant_1 === buddyId && c.participant_2 === userId) ||
      c.id === [userId, buddyId].sort().join('_')
    );
    if (existing) return existing;

    const convoId = [userId, buddyId].sort().join('_');
    const newConvo = {
      id: convoId,
      participant_1: userId,
      participant_2: buddyId,
      participants: [userId, buddyId],
      buddyName: buddyName || 'Buddy',
      buddyAvatar: buddyAvatar || null,
      lastMessage: '',
      lastMessageTime: null,
      unreadCount: 0,
    };

    setConversations(prev => [newConvo, ...prev]);
    setMessages(prev => ({ ...prev, [convoId]: prev[convoId] || [] }));

    if (useSupabase && !buddyId.startsWith('seed_') && !buddyId.startsWith('local_')) {
      const p1 = [userId, buddyId].sort()[0];
      const p2 = [userId, buddyId].sort()[1];
      const { data } = await supabase
        .from('conversations')
        .insert({ participant_1: p1, participant_2: p2, last_message: '' })
        .select()
        .single();

      if (data) {
        newConvo.id = data.id;
      }
    }

    return newConvo;
  }, [conversations, useSupabase]);

  // ── Send Message ──
  const sendMessage = useCallback(async (convoId, senderId, text) => {
    const convo = conversations.find(c => c.id === convoId);
    const buddyName = convo?.buddyName || 'Buddy';

    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      senderId: senderId,
      sender_id: senderId,
      text,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      read: false,
      conversation_id: convoId,
      status: 'sent',
    };

    // Optimistic update
    setMessages(prev => {
      const updated = { ...prev, [convoId]: [...(prev[convoId] || []), msg] };
      if (!useSupabase) saveMsgs(updated);
      return updated;
    });

    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === convoId
          ? { ...c, lastMessage: text, lastMessageTime: msg.timestamp }
          : c
      );
      if (!useSupabase) saveConvos(updated);
      return updated;
    });

    // Try DB insert
    if (useSupabase && !convoId.includes('seed_') && !convoId.includes('local_')) {
      await supabase.from('messages').insert({
        conversation_id: convoId,
        sender_id: senderId,
        text,
      });

      await supabase.from('conversations').update({
        last_message: text,
        last_message_time: new Date().toISOString(),
      }).eq('id', convoId);
    }

    // Mark as delivered after brief delay
    setTimeout(() => {
      setMessages(prev => {
        const updated = {
          ...prev,
          [convoId]: (prev[convoId] || []).map(m =>
            m.id === msg.id ? { ...m, status: 'delivered' } : m
          )
        };
        if (!useSupabase) saveMsgs(updated);
        return updated;
      });
    }, 800);

    // Simulate buddy response
    simulateBuddyResponse(convoId, senderId, buddyName, text);

    return msg;
  }, [conversations, useSupabase, saveMsgs, saveConvos]);

  const simulateBuddyResponse = (convoId, senderId, buddyName, userText) => {
    // Context-aware responses based on what the user said
    const contextResponses = getContextualResponse(userText, buddyName);

    setTypingUsers(prev => ({ ...prev, [convoId]: true }));

    const delay = 1500 + Math.random() * 2000;
    setTimeout(() => {
      setTypingUsers(prev => ({ ...prev, [convoId]: false }));

      const buddyMsg = {
        id: 'msg_' + Date.now() + '_b',
        senderId: 'buddy',
        sender_id: 'buddy',
        text: contextResponses,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        read: false,
        conversation_id: convoId,
        status: 'delivered',
      };

      setMessages(prev => {
        const updated = {
          ...prev,
          [convoId]: [...(prev[convoId] || []), buddyMsg]
        };
        if (!useSupabase) saveMsgs(updated);
        return updated;
      });

      const isActive = activeConvoIdRef.current === convoId;
      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === convoId
            ? {
                ...c,
                lastMessage: buddyMsg.text,
                lastMessageTime: buddyMsg.timestamp,
                unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1
              }
            : c
        );
        if (!useSupabase) saveConvos(updated);
        return updated;
      });
    }, delay);
  };

  const getContextualResponse = (userText, buddyName) => {
    const lower = userText.toLowerCase();

    if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      const greetings = [
        `Hey there! 😊 So glad we matched! I'm ${buddyName}. Ready to plan an adventure?`,
        `Hello! 👋 Super excited to connect. What kind of trip are you thinking?`,
        `Hi! Great to meet you! I've been looking for a travel buddy. Where should we go? 🌍`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    if (lower.includes('when') || lower.includes('date') || lower.includes('schedule')) {
      return "I'm pretty flexible with dates! I was thinking sometime next month. When works best for you? 📅";
    }

    if (lower.includes('budget') || lower.includes('cost') || lower.includes('money') || lower.includes('expensive')) {
      return "Great question! I think we should set a budget range. I usually spend around $50-100/day depending on the destination. What's your comfort zone? 💰";
    }

    if (lower.includes('food') || lower.includes('eat') || lower.includes('restaurant')) {
      return "Oh I LOVE trying local food! 🍜 We should definitely make a food bucket list for our trip. Street food tours are the best!";
    }

    if (lower.includes('hotel') || lower.includes('stay') || lower.includes('hostel') || lower.includes('accommodation')) {
      return "I usually go with hostels or Airbnbs — better for meeting people and saving money! But I'm open to whatever you prefer 🏨";
    }

    if (lower.includes('flight') || lower.includes('plane') || lower.includes('fly')) {
      return "I'll start looking at flights! Have you tried Google Flights? They usually have the best deals. Let me know your departure city 🛫";
    }

    const generalResponses = [
      "That sounds amazing! I'd love to explore that! 🌍",
      "Great idea! Let's start planning the details ✈️",
      "I've been wanting to do something like this! Let's make it happen 🗺️",
      "Awesome! Count me in! This is going to be epic 🎉",
      "Perfect timing, I have vacation days coming up! Let's lock in the dates 📝",
      "So excited about this! Should we create a shared itinerary? 📋",
      `That's one of my dream plans! Let's do this, ${buddyName.split(' ')[0]} is ready! 😍`,
      "Have you been there before? I'd love any tips you have! 🤔",
    ];
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  };

  const markAsRead = useCallback((convoId) => {
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === convoId ? { ...c, unreadCount: 0 } : c
      );
      if (!useSupabase) saveConvos(updated);
      return updated;
    });
  }, [useSupabase, saveConvos]);

  const getMessages = useCallback((convoId) => {
    return messages[convoId] || [];
  }, [messages]);

  const getTotalUnread = useCallback(() => {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  return (
    <ChatContext.Provider value={{
      conversations,
      messages,
      typingUsers,
      activeConvoId,
      setActiveConvoId,
      getOrCreateConversation,
      sendMessage,
      markAsRead,
      getMessages,
      loadMessages,
      getTotalUnread,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
