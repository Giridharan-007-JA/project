import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhdtT0VMBmz8-vsVVa9KlcycSHnvtyxE4",
  authDomain: "alumni-connection-007.firebaseapp.com",
  projectId: "alumni-connection-007",
  storageBucket: "alumni-connection-007.appspot.com",
  messagingSenderId: "210833800961",
  appId: "1:210833800961:web:cb46b2ef133bd0d48a6500",
  measurementId: "G-MJQ8BJ5520"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Extract username from email and save to localStorage
        const username = email.split('@')[0];
        localStorage.setItem('username', username);
        
        alert("Registration successful!");
        window.location.href = "ft1.html";
      })
      .catch((error) => {
        alert("Registration failed: " + error.message);
      });
  });
});