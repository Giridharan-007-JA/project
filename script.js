// Import Firebase functions (only if using ES Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// ✅ Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhdtT0VMBmz8-vsVVa9KlcycSHnvtyxE4",
  authDomain: "alumni-connection-007.firebaseapp.com",
  projectId: "alumni-connection-007",
  storageBucket: "alumni-connection-007.appspot.com",
  messagingSenderId: "210833800961",
  appId: "1:210833800961:web:cb46b2ef133bd0d48a6500",
  measurementId: "G-MJQ8BJ5520"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ Add listener for login form
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const userType = document.getElementById("userType").value;

    if (!userType) {
      alert("Please select a user type!");
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Get username from email
        const username = email.split('@')[0];
        // Store username in localStorage
        localStorage.setItem('username', username);
        alert("Login successful!");

        // ✅ Redirect to dashboard based on role
        if (userType === "student") {
          window.location.href = "student.html";
        } else if (userType === "alumni") {
          window.location.href = "alumni_new.html";
        } else if (userType === "admin") {
          window.location.href = "admin.html";
        }
      })
      .catch((error) => {
        alert("Login failed: " + error.message);
      });
  });
});
