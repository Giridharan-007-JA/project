// FIXED ALUMNI PAGE CODE (alumni.js)
// Replace the entire alumni.js file with this:

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp  // <-- IMPORTANT: Added this
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Get Firebase instances
const db = getFirestore();
const auth = getAuth();

// Global variables for messaging
let currentUser = null;
let currentConversationId = null;
let unsubscribeMessages = null;

// Helper function to get initials from a name
function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

// Load an alumni profile from Firestore
async function loadAlumniProfile(uid) {
  try {
    const profileDoc = await getDoc(doc(db, 'alumni', uid));
    let profileData;
    if (profileDoc.exists()) {
      profileData = profileDoc.data();
    } else {
      const username = localStorage.getItem('username') || auth.currentUser?.email?.split('@')[0] || 'Alumni';
      const displayName = username.charAt(0).toUpperCase() + username.slice(1);
      
      profileData = {
        name: displayName,
        graduationYear: "2023",
        company: "",
        position: "",
        email: auth.currentUser?.email || "",
        skills: ["Software Development", "Cloud Computing", "Team Leadership"],
        createdAt: new Date()
      };
      
      await setDoc(doc(db, 'alumni', uid), profileData);
    }
    return profileData;
  } catch (err) {
    console.error('Error loading alumni profile:', err);
    throw err;
  }
}

// FIXED: Load student requests - Only show requests TO THIS ALUMNI
async function loadRequests() {
  const requestsGrid = document.getElementById('requestsGrid');
  if (!requestsGrid) return;

  try {
    if (!currentUser) {
      requestsGrid.innerHTML = '<p>Please log in to view requests.</p>';
      return;
    }

    // FIXED: Query only requests for the current alumni user
    const requestsQuery = query(
      collection(db, 'requests'),
      where('toId', '==', currentUser.uid)  // <-- THIS WAS MISSING
    );
    
    const requestsSnap = await getDocs(requestsQuery);
    
    if (requestsSnap.empty) {
      requestsGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No requests found.</p>';
      return;
    }

    const requestsHtml = [];
    requestsSnap.forEach(docSnapshot => {
      const request = docSnapshot.data();
      requestsHtml.push(`
        <div class="request-card">
          <div class="request-header">
            <div class="student-avatar">${getInitials(request.studentName || 'Student')}</div>
            <div class="request-info">
              <h4>${request.studentName || 'Unknown'}</h4>
              <p>${request.department || ''} ${request.year ? '- ' + request.year : ''}</p>
            </div>
            <span class="request-type ${(request.type || 'general').toLowerCase()}">${request.type || 'General'}</span>
          </div>
          <p class="request-message">${request.message || ''}</p>
          <div class="request-actions">
            ${request.status === 'pending' ? `
              <button class="accept-btn" data-id="${docSnapshot.id}"><i class="fas fa-check"></i> Accept</button>
              <button class="decline-btn" data-id="${docSnapshot.id}"><i class="fas fa-times"></i> Decline</button>
            ` : `
              <span class="status-badge ${request.status}">${request.status}</span>
            `}
            <span class="request-time">${request.timestamp ? new Date(request.timestamp.toDate()).toLocaleString() : ''}</span>
          </div>
        </div>
      `);
    });

    requestsGrid.innerHTML = requestsHtml.join('');

    // Handle accept/decline actions
    document.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const requestId = btn.getAttribute('data-id');
        try {
          await setDoc(doc(db, 'requests', requestId), {
            status: 'accepted',
            updatedAt: new Date()
          }, { merge: true });
          alert('Request accepted!');
          loadRequests();
        } catch (err) {
          console.error('Error accepting request:', err);
          alert('Failed to accept request: ' + err.message);
        }
      });
    });

    document.querySelectorAll('.decline-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const requestId = btn.getAttribute('data-id');
        try {
          await setDoc(doc(db, 'requests', requestId), {
            status: 'declined',
            updatedAt: new Date()
          }, { merge: true });
          alert('Request declined!');
          loadRequests();
        } catch (err) {
          console.error('Error declining request:', err);
          alert('Failed to decline request: ' + err.message);
        }
      });
    });
  } catch (err) {
    console.error('Error loading requests:', err);
    requestsGrid.innerHTML = `<p style="color: red; padding: 20px;">Error loading requests: ${err.message}</p>`;
  }
}

// Load job posts from Firestore
async function loadJobs() {
  const jobsGrid = document.querySelector('.jobs-grid');
  if (!jobsGrid) return;

  try {
    const jobsSnap = await getDocs(collection(db, 'jobs'));
    if (jobsSnap.empty) {
      jobsGrid.innerHTML = '<p style="text-align: center; padding: 40px;">No job posts found.</p>';
      return;
    }

    const jobsHtml = [];
    jobsSnap.forEach(docSnapshot => {
      const job = docSnapshot.data();
      jobsHtml.push(`
        <div class="job-card">
          <div class="job-header">
            <h3>${job.title || ''}</h3>
            <span class="job-type ${(job.type || '').toLowerCase()}">${job.type || 'Full-time'}</span>
          </div>
          <div class="job-info">
            <p><i class="fas fa-building"></i> ${job.company || ''}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${job.location || ''}</p>
          </div>
          <p class="job-description">${job.description || ''}</p>
          ${job.requirements ? `
            <div class="job-requirements">
              <h4>Requirements:</h4>
              <ul>
                ${job.requirements.map(req => `<li>${req}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          <div class="job-actions">
            <button class="edit-job-btn" data-id="${docSnapshot.id}"><i class="fas fa-edit"></i> Edit</button>
            <button class="delete-job-btn" data-id="${docSnapshot.id}"><i class="fas fa-trash"></i> Delete</button>
            <span class="post-date">Posted: ${job.postedDate ? new Date(job.postedDate.toDate()).toLocaleDateString() : ''}</span>
          </div>
        </div>
      `);
    });

    jobsGrid.innerHTML = jobsHtml.join('');

    // Handle edit/delete actions
    document.querySelectorAll('.edit-job-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const jobId = btn.getAttribute('data-id');
        try {
          const jobDoc = await getDoc(doc(db, 'jobs', jobId));
          if (jobDoc.exists()) {
            const jobData = jobDoc.data();
            const newTitle = prompt('Edit job title:', jobData.title);
            if (newTitle !== null) {
              await setDoc(doc(db, 'jobs', jobId), {
                ...jobData,
                title: newTitle,
                updatedAt: new Date()
              });
              alert('Job post updated!');
              loadJobs();
            }
          }
        } catch (err) {
          console.error('Error editing job:', err);
          alert('Failed to edit job post: ' + err.message);
        }
      });
    });

    document.querySelectorAll('.delete-job-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this job post?')) {
          const jobId = btn.getAttribute('data-id');
          try {
            await deleteDoc(doc(db, 'jobs', jobId));
            alert('Job post deleted!');
            loadJobs();
          } catch (err) {
            console.error('Error deleting job:', err);
            alert('Failed to delete job post: ' + err.message);
          }
        }
      });
    });
  } catch (err) {
    console.error('Error loading jobs:', err);
    jobsGrid.innerHTML = `<p style="color: red;">Error loading job posts: ${err.message}</p>`;
  }
}

// MESSAGING FUNCTIONS - FIXED
const loadConversations = () => {
  if (!currentUser || !document.getElementById('conversationsList')) return;

  const conversationsList = document.getElementById('conversationsList');
  const convQuery = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', currentUser.uid)
  );

  onSnapshot(convQuery, (snapshot) => {
    if (snapshot.empty) {
      conversationsList.innerHTML = '<p style="padding:40px;text-align:center;color:var(--text-secondary);">No conversations yet</p>';
      return;
    }

    const conversations = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const timestamp = data.lastMessageTime?.toDate ? data.lastMessageTime.toDate().getTime() : 0;
      conversations.push({ id: docSnap.id, data, timestamp });
    });

    conversations.sort((a, b) => b.timestamp - a.timestamp);

    conversationsList.innerHTML = conversations.map(conv => {
      const otherUserId = conv.data.participants.find(id => id !== currentUser.uid);
      const otherUserName = conv.data.participantNames?.[otherUserId] || 'Unknown';
      const unreadCount = conv.data.unreadCount?.[currentUser.uid] || 0;

      return `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
             data-id="${conv.id}" 
             data-name="${otherUserName}">
          <div class="chat-avatar">${getInitials(otherUserName)}</div>
          <div style="flex:1;">
            <h4 style="font-size:16px;font-weight:600;margin-bottom:4px;">${otherUserName}</h4>
            <p style="color:var(--text-secondary);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${conv.data.lastMessage || 'No messages yet'}
            </p>
          </div>
          ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ''}
        </div>
      `;
    }).join('');

    document.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const convId = item.getAttribute('data-id');
        const contactName = item.getAttribute('data-name');
        loadConversation(convId, contactName);
      });
    });
  });
};

const loadConversation = (conversationId, contactName) => {
  if (!conversationId || !currentUser) return;

  currentConversationId = conversationId;
  const chatContactName = document.getElementById('chatContactName');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn');
  const messageArea = document.getElementById('messageArea');

  if (chatContactName) chatContactName.textContent = contactName;
  if (messageInput) messageInput.disabled = false;
  if (sendBtn) sendBtn.disabled = false;

  if (unsubscribeMessages) unsubscribeMessages();

  updateDoc(doc(db, 'conversations', conversationId), {
    [`unreadCount.${currentUser.uid}`]: 0
  }).catch(err => console.error('Error marking as read:', err));

  const messagesQuery = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    if (!messageArea) return;

    messageArea.innerHTML = '';
    if (snapshot.empty) {
      messageArea.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">No messages yet.</p>';
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
          <p style="margin:0;word-wrap:break-word;">${msg.text || ''}</p>
          ${timestamp ? `<span class="message-time">${timestamp.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>` : ''}
        </div>`;
      messageArea.appendChild(messageEl);
    });
    messageArea.scrollTop = messageArea.scrollHeight;
  });
};

const sendMessage = async () => {
  const messageInput = document.getElementById('messageInput');
  if (!messageInput) return;
  const text = messageInput.value.trim();

  if (!currentUser || !currentConversationId || !text) return;

  try {
    await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), {
      text,
      senderId: currentUser.uid,
      timestamp: serverTimestamp()
    });

    const convDoc = await getDoc(doc(db, 'conversations', currentConversationId));
    if (!convDoc.exists()) throw new Error('Conversation not found');

    const convData = convDoc.data();
    const otherUserId = convData.participants.find(id => id !== currentUser.uid);

    await updateDoc(doc(db, 'conversations', currentConversationId), {
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
      [`unreadCount.${otherUserId}`]: (convData.unreadCount?.[otherUserId] || 0) + 1
    });

    messageInput.value = '';
    const messageArea = document.getElementById('messageArea');
    if (messageArea) messageArea.scrollTop = messageArea.scrollHeight;

  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message: ' + error.message);
  }
};

// Event listeners for messaging
document.getElementById('sendMessageBtn')?.addEventListener('click', sendMessage);
document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        currentUser = user;  // Set global currentUser
        
        // Load profile and update UI
        const profileData = await loadAlumniProfile(user.uid);
        const displayName = profileData.name;
        
        // Update welcome message and avatars
        document.getElementById('welcomeUsername').textContent = displayName;
        document.getElementById('userAvatar').textContent = getInitials(displayName);
        document.getElementById('profileAvatar').textContent = getInitials(displayName);

        // Update profile information
        document.getElementById('profileName').textContent = displayName;
        document.getElementById('email').textContent = profileData.email || user.email;
        document.getElementById('graduationYear').textContent = profileData.graduationYear || "2023";
        document.getElementById('company').textContent = profileData.company || "Not set";
        document.getElementById('position').textContent = profileData.position || "Not set";
        
        // Update skills
        const skillsList = document.getElementById('skillsList');
        if (skillsList && profileData.skills?.length) {
          skillsList.innerHTML = profileData.skills.map(skill => 
            `<span class="skill-tag">${skill}</span>`
          ).join('');
        }

        // Set up navigation
        document.querySelectorAll('.nav-links li[data-page]').forEach(item => {
          item.addEventListener('click', () => {
            document.querySelectorAll('.nav-links li').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const pageId = item.getAttribute('data-page');
            document.querySelectorAll('.content-section').forEach(section => {
              section.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');
            
            // Load data when switching to specific pages
            if (pageId === 'chat') {
              loadConversations();
            }
          });
        });

        // Initialize other sections
        await Promise.all([
          loadRequests(),
          loadJobs(),
          loadConversations()  // Load conversations on init
        ]);
      } catch (err) {
        console.error('Error initializing alumni page:', err);
        alert('Failed to load profile: ' + err.message);
      }
    } else {
      window.location.href = "ft1.html";
    }
  });
});