console.log("script.js loaded");

function toggleMenu() {
  document.querySelector(".mobile-menu").classList.add("active");
}

function closeMenu() {
  document.querySelector(".mobile-menu").classList.remove("active");
}

const forms = document.querySelector(".forms"),
  pwShowHide = document.querySelectorAll(".eye-icon"),
  links = document.querySelectorAll(".link");

pwShowHide.forEach(eyeIcon => {
  eyeIcon.addEventListener("click", () => {
    let pwFields = eyeIcon.parentElement.parentElement.querySelectorAll(".password");
    pwFields.forEach(password => {
      if (password.type === "password") {
        password.type = "text";
        eyeIcon.classList.replace("bx-hide", "bx-show");
        return;
      }
      password.type = "password";
      eyeIcon.classList.replace("bx-show", "bx-hide");
    });
  });
});

links.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    forms.classList.toggle("show-signup");
  });
});

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("signup") === "true") {
  forms.classList.add("show-signup");
}

document.addEventListener("DOMContentLoaded", function () {

  function updateAuthDisplay() {
    const token = localStorage.getItem("token");

    if (token) {
      // Token is active: Hide login, signup, and get started buttons
      // For the main navigation area
      const loginBtn = document.querySelector(".nav-buttons .login");
      const signupBtn = document.querySelector(".nav-buttons .signup");
      const getStartedBtn = document.querySelector(".hero .btn");
      if (loginBtn) loginBtn.style.display = "none";
      if (signupBtn) signupBtn.style.display = "none";
      if (getStartedBtn) getStartedBtn.style.display = "none";

      // For the mobile menu buttons
      const mobileButtons = document.querySelector(".nav-buttons2");
      if (mobileButtons) mobileButtons.style.display = "none";

      // Show logout button
      const logoutBtn = document.getElementById("logoutbtn");
      if (logoutBtn) logoutBtn.style.display = "flex";
    } else {
      // Token is not active: Show login, signup, and get started buttons
      const loginBtn = document.querySelector(".nav-buttons .login");
      const signupBtn = document.querySelector(".nav-buttons .signup");
      const getStartedBtn = document.querySelector(".hero .btn");
      if (loginBtn) loginBtn.style.display = "block";
      if (signupBtn) signupBtn.style.display = "block";
      if (getStartedBtn) getStartedBtn.style.display = "inline-block";

      // For the mobile menu buttons
      const mobileButtons = document.querySelector(".nav-buttons2");
      if (mobileButtons) mobileButtons.style.display = "block";

      // Hide logout button
      const logoutBtn = document.getElementById("logoutbtn");
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  }

  // Initial check on page load
  updateAuthDisplay();

  // Check if redirected from Google OAuth with token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const email = urlParams.get("email");
  
  if (token) {
    localStorage.setItem("token", token);
    if (email) {
      localStorage.setItem("email", email);
    }
    alert("Google authentication successful!");
    window.location.href = "dashboard.html";
  }

  function isValidEmail(email) {
    // Regular Expression for basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
  function isValidPassword(password) {
    // Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 digit, and 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{8,}$/;
    return passwordRegex.test(password);
  }

  // Set up Google login/signup buttons
  const googleLoginBtn = document.querySelector(".login .field.google");
  const googleSignupBtn = document.querySelector(".signup .field.google");
  
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", function(e) {
      e.preventDefault();
      window.location.href = "/api/auth/google";
    });
  }
  
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener("click", function(e) {
      e.preventDefault();
      window.location.href = "/api/auth/google";
    });
  }

  document.querySelector(".login .button-field button").addEventListener("click", async function (event) {
    event.preventDefault();

    let email = document.querySelector(".login input[type='email']").value;
    let password = document.querySelector(".login input[type='password']").value;

    console.log("Email being sent:", email); // Debugging

    if (!email || !password) {
      alert("Email and Password cannot be empty!");
      return;
    }

    let response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    let data = await response.json();
    console.log("Response received:", data); // Debugging
    if (data.token) {
      localStorage.setItem("token", data.token);
      // localStorage.setItem("email", data.email);
      alert("Login successful!");
      window.location.href = "dashboard.html";
    } else {
      alert(data.error || "Login failed");
    }
  });

  document.querySelector(".signup .button-field button").addEventListener("click", async function (event) {
    event.preventDefault();

    console.log("Working part1"); //Debugging
    
    // Check if these elements exist before accessing them
    let email = document.querySelector(".signup input[type='email']").value;
    let password = document.querySelector(".signup input[type='password']").value;

    console.log("Working part 2:", email); // Debugging

    if (!email || !password) {
      alert("Please fill in both fields");
      return;
    }
    
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address (e.g., user@example.com)!");
      return;
    }
    if (!isValidPassword(password)) {
      alert("Password must be at least 8 characters long, include one uppercase, one lowercase, one digit, and one special character (@, #, $, etc.)");
      return;
    }

    let response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
      
    });

    let data = await response.json();
    console.log("Response received:", data); // Debugging
    if (data.message) {
      alert("Signup successful! Redirecting to home page.");
      window.location.href = "connect-codeforces.html";
    } else {
      alert(data.error || "Signup failed");
    }
  });
});


document.addEventListener("DOMContentLoaded", function () {
  const logoutBtn = document.getElementById("logoutbtn");

  if (!logoutBtn) {
    console.error("Logout button not found! Check your HTML.");
    return;
  }

  logoutBtn.addEventListener("click", async function (event) {
    event.preventDefault();

    // Show a confirmation dialog
    const sure = confirm("Are you sure you want to quit?");
    if (!sure) {
      // If user clicks "Cancel", do nothing
      return;
    }
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        throw new Error("Failed to logout");
      }

      localStorage.removeItem("token");  // Clear JWT
      window.location.href = "base.html"; // Redirect

    } catch (error) {
      console.error("Logout failed", error);
      alert("Error logging out. Please try again.");
    }
  });
});



document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  console.log(localStorage.getItem("email"))

  function checkAuthAndNavigate(page) {
    if (!token) {
      alert("You must log in or sign up first!");
      window.location.href = "login.html";
    } else {
      window.location.href = page;
    }
  }

  document.querySelector("#homeLink").addEventListener("click", (event) => {
    event.preventDefault();
    checkAuthAndNavigate("dashboard.html");
  });

  document.querySelector("#contestLink").addEventListener("click", (event) => {
    event.preventDefault();
    checkAuthAndNavigate("contest.html");
  });

  document.querySelector("#problemLink").addEventListener("click", (event) => {
    event.preventDefault();
    checkAuthAndNavigate("problem.html");
  });

  document.querySelector("#profileLink").addEventListener("click", (event) => {
    event.preventDefault();
    checkAuthAndNavigate("profile.html");
  });
});