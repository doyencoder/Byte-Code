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
  document.querySelector(".login .button-field button").addEventListener("click", async function (event) {
    event.preventDefault();

    let email = document.querySelector(".login input[type='email']").value;
    let password = document.querySelector(".login input[type='password']").value;

    let response = await fetch("http://127.0.0.1:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    let data = await response.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      alert("Login successful!");
      window.location.href = "home.html";
    } else {
      alert(data.error || "Login failed");
    }
  });

  document.querySelector(".signup .button-field button").addEventListener("click", async function (event) {
    event.preventDefault();

    let email = document.querySelector(".signup input[type='email']").value;
    let password = document.querySelector(".signup input[type='password']").value;

    let response = await fetch("http://127.0.0.1:5000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    let data = await response.json();
    if (data.message) {
      alert("Signup successful! Redirecting to home page.");
      window.location.href = "home.html";
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

  logoutBtn.addEventListener("click", async function () {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        throw new Error("Failed to logout");
      }

      localStorage.removeItem("token");  // Clear JWT
      alert("You have been logged out!");
      window.location.href = "base.html"; // Redirect

    } catch (error) {
      console.error("Logout failed", error);
      alert("Error logging out. Please try again.");
    }
  });
});



document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

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
    checkAuthAndNavigate("home.html");
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
