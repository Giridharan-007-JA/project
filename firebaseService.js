// Firebase service utilities
import { collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Basic CRUD Operations
export async function addStudent(db, data) {
  return await addDoc(collection(db, 'students'), data);
}

export async function addAlumni(db, data) {
  return await addDoc(collection(db, 'alumni'), data);
}

export async function addAdmin(db, data) {
  return await addDoc(collection(db, 'admins'), data);
}

export async function getCollectionDocs(db, collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  const items = [];
  snapshot.forEach(docSnap => {
    items.push({ id: docSnap.id, ...docSnap.data() });
  });
  return items;
}

export async function setDocById(db, collectionName, id, data) {
  return await setDoc(doc(db, collectionName, id), data);
}

// Chat Functions
export async function initializeChat(db, userId, onMessageReceived) {
  // Query for conversations involving current user
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );

  // Set up real-time listener for conversations
  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const conversationData = change.doc.data();
        if (onMessageReceived && conversationData.lastMessage) {
          onMessageReceived(conversationData);
        }
      }
    });
  });

  return unsubscribe;
}

export async function sendMessage(db, conversationId, senderId, receiverId, message) {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (conversationDoc.exists()) {
      // Add message to existing conversation
      const messageRef = await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId,
        message,
        timestamp: new Date()
      });

      // Update conversation's last message
      await setDoc(conversationRef, {
        lastMessage: message,
        lastMessageTime: new Date(),
        lastMessageId: messageRef.id
      }, { merge: true });
    } else {
      // Create new conversation
      const newConversation = {
        participants: [senderId, receiverId],
        createdAt: new Date(),
        lastMessage: message,
        lastMessageTime: new Date()
      };
      
      await setDoc(conversationRef, newConversation);

      // Add first message
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId,
        message,
        timestamp: new Date()
      });
    }

    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Connection Functions
export async function sendConnectionRequest(db, fromId, toId, message = '') {
  try {
    const requestId = `${fromId}_${toId}`;
    const requestRef = doc(db, 'requests', requestId);
    
    // Check if request already exists
    const existingRequest = await getDoc(requestRef);
    if (existingRequest.exists()) {
      const data = existingRequest.data();
      if (data.status === 'pending') {
        throw new Error('Connection request already pending');
      }
      if (data.status === 'accepted') {
        throw new Error('Already connected');
      }
    }

    // Get sender details
    const senderDoc = await getDoc(doc(db, 'students', fromId));
    if (!senderDoc.exists()) {
      throw new Error('Sender profile not found');
    }
    const senderData = senderDoc.data();

    // Create connection request
    await setDoc(requestRef, {
      fromId,
      toId,
      status: 'pending',
      type: 'connection',
      message: message || 'Would like to connect with you',
      studentName: senderData.name,
      department: senderData.department,
      year: senderData.yearOfStudy,
      timestamp: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error sending connection request:', error);
    throw error;
  }
}

export async function handleConnectionRequest(db, requestId, action) {
  try {
    const requestRef = doc(db, 'requests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestDoc.data();
    if (requestData.status !== 'pending') {
      throw new Error('Request already ' + requestData.status);
    }

    // Update request status
    await setDoc(requestRef, {
      status: action,
      updatedAt: new Date()
    }, { merge: true });

    if (action === 'accepted') {
      // Create connection records for both users
      const connectionId = `${requestData.fromId}_${requestData.toId}`;
      await setDoc(doc(db, 'connections', connectionId), {
        users: [requestData.fromId, requestData.toId],
        createdAt: new Date(),
        status: 'active'
      });
    }

    return true;
  } catch (error) {
    console.error('Error handling connection request:', error);
    throw error;
  }
}

// Job Functions
export async function createJob(db, jobData) {
  try {
    const jobRef = await addDoc(collection(db, 'jobs'), {
      ...jobData,
      postedDate: new Date(),
      status: 'active'
    });
    return jobRef.id;
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
}

export async function updateJob(db, jobId, jobData) {
  try {
    await setDoc(doc(db, 'jobs', jobId), {
      ...jobData,
      updatedAt: new Date()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating job:', error);
    throw error;
  }
}

export async function deleteJob(db, jobId) {
  try {
    await setDoc(doc(db, 'jobs', jobId), {
      status: 'deleted',
      deletedAt: new Date()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
}
