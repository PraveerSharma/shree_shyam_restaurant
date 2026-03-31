// ============================================
// CHAT SERVICE
// Direct messaging between users and admin
// ============================================

const CHATS_KEY = 'ssr_chats';

function getChats() {
  try {
    return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveChats(chats) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function getMessages(orderId) {
  const chats = getChats();
  const chat = chats.find(c => c.orderId === orderId);
  return chat ? chat.messages : [];
}

export function sendMessage(orderId, text, sender, userId = 'guest') {
  if (!text.trim()) return { success: false, error: 'Empty message' };

  const chats = getChats();
  let chatIndex = chats.findIndex(c => c.orderId === orderId);

  const newMessage = {
    sender,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };

  if (chatIndex === -1) {
    // Create new chat
    chats.push({
      orderId,
      userId,
      messages: [newMessage]
    });
  } else {
    chats[chatIndex].messages.push(newMessage);
  }

  saveChats(chats);
  
  // Dispatch event for real-time updates in same tab
  window.dispatchEvent(new CustomEvent('new-chat-message', { 
    detail: { orderId, message: newMessage } 
  }));
  
  return { success: true, message: newMessage };
}

export function getUnreadCount(orderId, senderType) {
  // Simple implementation: all messages seen if chat is open
  // This could be expanded with 'seen' timestamps
  return 0; 
}
