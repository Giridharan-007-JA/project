// FIXED STUDENT MESSAGING CODE
// Add these imports at the top of your student.html script section

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy,
  addDoc, 
  getDoc, 
  getDocs,
  doc, 
  updateDoc,
  onSnapshot,
  serverTimestamp  // <-- THIS WAS MISSING
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const db = getFirestore();
let currentUser = null;
let currentConversationId = null;
let unsubscribeMessages = null;

// Helper function
const getInitials = (name = '') => {
  return name
    .split(' ')
    .map(word => word[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);
};

// START CONVERSATION - FIXED
const startConversation = async (alumniId, alumniName) => {
  try {
    if (!currentUser) {
      alert('Please log in first');
      return;
    }

    // Check if conversation already exists
    const convQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid)
    );
    const convSnap = await getDocs(convQuery);
    
    let conversationId = null;
    convSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.participants.includes(alumniId)) {
        conversationId = docSnap.id;
      }
    });

    // Create new conversation if doesn't exist
    if (!conversationId) {
      const convRef = await addDoc(collection(db, 'conversations'), {
        participants: [currentUser.uid, alumniId],
        participantNames: { 
          [currentUser.uid]: currentUser.displayName || 'Student', 
          [alumniId]: alumniName 
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        unreadCount: { 
          [currentUser.uid]: 0, 
          [alumniId]: 0 
        }
      });
      conversationId = convRef.id;
    }

    // Switch to chat page and load conversation
    document.querySelector('[data-page="chat"]')?.click();
    setTimeout(() => {
      loadConversation(conversationId, alumniName);
    }, 300);
  } catch (error) {
    console.error('Error starting conversation:', error);
    alert('Failed to start conversation: ' + error.message);
  }
};

// LOAD CONVERSATIONS - FIXED
const loadConversations = () => {
  if (!currentUser) {
    console.error('No current user for loading conversations');
    return;
  }

  const conversationsList = document.getElementById('conversationsList');
  if (!conversationsList) {
    console.error('conversationsList element not found');
    return;
  }

  try {
    const convQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid)
    );

    onSnapshot(convQuery, (snapshot) => {
      if (snapshot.empty) {
        conversationsList.innerHTML = '<p style="padding: 40px; text-align: center; color: var(--text-secondary);">No conversations yet</p>';
        return;
      }

      // Sort conversations by last message time
      const conversations = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const timestamp = data.lastMessageTime?.toDate ? data.lastMessageTime.toDate().getTime() : 0;
        conversations.push({ id: docSnap.id, data, timestamp });
      });

      conversations.sort((a, b) => b.timestamp - a.timestamp);

      const conversationsHtml = conversations.map(conv => {
        const otherUserId = conv.data.participants.find(id => id !== currentUser.uid);
        const otherUserName = conv.data.participantNames?.[otherUserId] || 'Unknown';
        const unreadCount = conv.data.unreadCount?.[currentUser.uid] || 0;

        return `
          <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
               data-id="${conv.id}" 
               data-name="${otherUserName}">
            <div class="chat-avatar">${getInitials(otherUserName)}</div>
            <div style="flex: 1;">
              <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${otherUserName}</h4>
              <p style="color: var(--text-secondary); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${conv.data.lastMessage || 'No messages yet'}
              </p>
            </div>
            ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ''}
          </div>
        `;
      }).join('');

      conversationsList.innerHTML = conversationsHtml;

      // Add click handlers
      document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
          const convId = item.getAttribute('data-id');
          const contactName = item.getAttribute('data-name');
          loadConversation(convId, contactName);
        });
      });
    }, (error) => {
      console.error('Error loading conversations:', error);
      conversationsList.innerHTML = '<p style="padding: 40px; text-align: center; color: var(--danger);">Error loading conversations</p>';
    });
  } catch (error) {
    console.error('Error setting up conversations listener:', error);
    conversationsList.innerHTML = '<p style="padding: 40px; text-align: center; color: var(--danger);">Error loading conversations</p>';
  }
};

// LOAD CONVERSATION MESSAGES - FIXED
const loadConversation = (conversationId, contactName) => {
  if (!conversationId || !currentUser) {
    console.error('Missing conversationId or currentUser', { conversationId, currentUser });
    return;
  }

  currentConversationId = conversationId;
  
  const chatContactName = document.getElementById('chatContactName');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn');
  const messageArea = document.getElementById('messageArea');

  if (chatContactName) chatContactName.textContent = contactName;
  if (messageInput) messageInput.disabled = false;
  if (sendBtn) sendBtn.disabled = false;

  // Unsubscribe from previous conversation
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  // Mark conversation as read
  updateDoc(doc(db, 'conversations', conversationId), {
    [`unreadCount.${currentUser.uid}`]: 0
  }).catch(err => console.error('Error marking as read:', err));

  // Listen to messages
  const messagesQuery = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    if (!messageArea) return;

    messageArea.innerHTML = '';
    
    if (snapshot.empty) {
      messageArea.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No messages yet. Start the conversation!</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      const isSent = msg.senderId === currentUser.uid;
      const timestamp = msg.timestamp?.toDate ? msg.timestamp.toDate() : null;
      
      const messageEl = document.createElement('div');
      messageEl.className = `message ${isSent ? 'sent' : 'received'}`;
      messageEl.innerHTML = `
        <div class="message-content">
          <p style="margin: 0; word-wrap: break-word;">${msg.text || ''}</p>
          ${timestamp ? `<span class="message-time">${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>` : ''}
        </div>
      `;
      messageArea.appendChild(messageEl);
    });

    // Scroll to bottom
    messageArea.scrollTop = messageArea.scrollHeight;
  }, (error) => {
    console.error('Error loading messages:', error);
    if (messageArea) {
      messageArea.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 40px;">Error loading messages</p>';
    }
  });

  // Update active conversation styling
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-id') === conversationId);
  });
};

// SEND MESSAGE - FIXED
const sendMessage = async () => {
  const messageInput = document.getElementById('messageInput');
  if (!messageInput) return;

  const text = messageInput.value.trim();
  
  if (!currentUser) {
    console.error('No current user');
    alert('Please log in to send messages');
    return;
  }

  if (!currentConversationId) {
    console.error('No active conversation');
    alert('Please select a conversation first');
    return;
  }

  if (!text) {
    return;
  }

  try {
    // Add message to subcollection
    await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), {
      text,
      senderId: currentUser.uid,
      timestamp: serverTimestamp()
    });

    // Get conversation data
    const convDoc = await getDoc(doc(db, 'conversations', currentConversationId));
    if (!convDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const convData = convDoc.data();
    const otherUserId = convData.participants.find(id => id !== currentUser.uid);

    // Update conversation metadata
    await updateDoc(doc(db, 'conversations', currentConversationId), {
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
      [`unreadCount.${otherUserId}`]: (convData.unreadCount?.[otherUserId] || 0) + 1
    });

    // Clear input
    messageInput.value = '';
    
    // Scroll to bottom
    const messageArea = document.getElementById('messageArea');
    if (messageArea) {
      messageArea.scrollTop = messageArea.scrollHeight;
    }
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message: ' + error.message);
  }
};

// EVENT LISTENERS
document.getElementById('sendMessageBtn')?.addEventListener('click', sendMessage);
document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Initialize when user is authenticated
// Call loadConversations() after setting currentUser