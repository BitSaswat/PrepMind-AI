// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from '../config/firebase-config.js';
console.log("Auth initialized from shared config.");

// ---------------------------------------------------------
// HELPER: SMART REDIRECT (Checks if user has a profile)
// ---------------------------------------------------------
async function routeUser(user) {
  console.log("Checking user profile...");
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));

    // If user exists AND has completed onboarding -> Dashboard
    if (userDoc.exists() && userDoc.data().onboardingCompleted) {
      console.log("Profile found. Going to Dashboard.");
      window.location.href = '../pages/dashboard.html';
    } else {
      // Otherwise -> Onboarding
      console.log("Profile incomplete. Going to Onboarding.");
      window.location.href = '../pages/onboarding.html';
    }
  } catch (error) {
    console.error("Error checking profile:", error);
    // If error, safer to send to onboarding
    window.location.href = '../pages/onboarding.html';
  }
}

// ---------------------------------------------------------
// GOOGLE SIGN-IN (Handles both Login and Signup buttons)
// ---------------------------------------------------------
const handleGoogleAuth = async () => {
  const provider = new GoogleAuthProvider();
  // Force account selection prompt
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Google Sign-In Success:", result.user.email);

    const msg = document.getElementById('loginMessage') || document.getElementById('signupMessage');
    if (msg) {
      msg.textContent = "Success! Verifying profile...";
      msg.style.display = 'block';
      msg.style.color = 'green';
    }

    // CHECK DATABASE BEFORE REDIRECTING
    await routeUser(result.user);

  } catch (error) {
    console.error("Google Auth Error:", error);
    const msg = document.getElementById('loginMessage') || document.getElementById('signupMessage');
    if (msg) {
      msg.textContent = "Google Sign-In failed: " + error.message;
      msg.className = "message error";
      msg.style.display = 'block';
    } else {
      alert("Google Sign-In failed: " + error.message);
    }
  }
};

const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');

if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleAuth);
if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleGoogleAuth);


// ---------------------------------------------------------
// EMAIL LOGIN LOGIC
// ---------------------------------------------------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (msg) {
        msg.textContent = "Login Success! Verifying profile...";
        msg.style.display = 'block';
        msg.style.color = 'green';
      }

      // CHECK DATABASE BEFORE REDIRECTING
      await routeUser(userCredential.user);

    } catch (error) {
      console.error("Login Error:", error);
      if (msg) {
        msg.textContent = "Login Failed: " + error.message;
        msg.className = "message error"; // Ensure red color
        msg.style.display = 'block';
      } else {
        alert("Login Failed: " + error.message);
      }
    }
  });
}


// ---------------------------------------------------------
// EMAIL SIGNUP LOGIC
// ---------------------------------------------------------
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const fullName = document.getElementById('fullName')?.value;
    const msg = document.getElementById('signupMessage');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Add Name to Profile
      if (fullName) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }

      if (msg) {
        msg.textContent = "Account Created! Redirecting to setup...";
        msg.style.display = 'block';
        msg.style.color = 'green';
      }

      // New email signups ALWAYS go to onboarding (no need to check DB)
      setTimeout(() => { window.location.href = '../pages/onboarding.html'; }, 1500);

    } catch (error) {
      console.error("Signup Error:", error);
      if (msg) {
        msg.textContent = "Signup Failed: " + error.message;
        msg.className = "message error";
        msg.style.display = 'block';
      } else {
        alert("Signup Failed: " + error.message);
      }
    }
  });
}


// ---------------------------------------------------------
// FORGOT PASSWORD LOGIC
// ---------------------------------------------------------
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;

    if (!email) {
      alert("Please enter your email in the box first, then click Forgot Password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset link sent to ${email}`);
    } catch (error) {
      console.error("Reset Error:", error);
      alert(error.message);
    }
  });
}

// ---------------------------------------------------------
// AUTH STATE LISTENER
// ---------------------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Current User:", user.email);
  } else {
    console.log("No user signed in.");
  }
});