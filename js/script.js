
var firebaseConfig = {
  apiKey: "AIzaSyAu6d39pIeNCTIEQE5eNeWC7P5RGcYq8QY",
  authDomain: "swiftpass-7486d.firebaseapp.com",
  databaseURL: "https://swiftpass-7486d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "swiftpass-7486d",
  storageBucket: "swiftpass-7486d.firebasestorage.app",
  messagingSenderId: "260241893203",
  appId: "1:260241893203:web:afed60250dcec4ea82a3a6",
  measurementId: "G-GDDSHTDZKW"
};

// Initialize Firebase
var app = firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.database();


function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }


function validateUsername(username) {
  var userCheck = /^(?=[a-zA-Z0-9._]{8,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/;
  return userCheck.test(username);
}

function validateEmail(email) {
  var emailCheck = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return emailCheck.test(email);
}

function validatePassword(password) {
  var passwordCheck = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
  return passwordCheck.test(password);
}

function validateMobile(mobileNumber) {
  var mobileCheck = /^((\+92)|(0092))-{0,1}\d{3}-{0,1}\d{7}$|^\d{11}$|^\d{4}-\d{7}$/;
  return mobileCheck.test(mobileNumber);
}


function changeIcon(passwordInputId, iconElement) {
  var passwordInput = document.getElementById(passwordInputId);
  var img = document.getElementById(iconElement);

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    img.src = "./images/invisible.png";
  } else {
    passwordInput.type = "password";
    img.src = "./images/show.png";
  }
}


function initAuthStateListener() {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      if (location.pathname !== "/profile.html" && 
          !location.pathname.includes("applicant.html") && 
          !location.pathname.includes("verifier.html") && 
          !location.pathname.includes("admin.html")) {
        // Redirect to appropriate dashboard based on user role
        db.ref("users/" + user.uid).once("value")
          .then(snap => {
            var profile = snap.val();
            if (profile) {
              switch(profile.role) {
                case "applicant":
                  window.location = "applicant.html";
                  break;
                case "verifier":
                case "admin":
                  window.location = "verifier.html";
                  break;
                default:
                  window.location = "index.html";
              }
            }
          })
          .catch(() => {
            window.location = "index.html";
          });
      }
    } else {
      // User is signed out
      if (!location.pathname.includes("login.html") && 
          !location.pathname.includes("signup.html") && 
          !location.pathname.includes("verifier-login.html") &&
          location.pathname !== "/index.html" &&
          location.pathname !== "/about.html" &&
          location.pathname !== "/contact.html") {
        window.location = "login.html";
      }
    }
  });
}

// sign out 
function signOut() {
  auth.signOut()
    .then(() => {
      alert("Logged out successfully");
      window.location = "index.html";
    })
    .catch(err => {
      console.error("Sign out error:", err);
      alert("Could not log out");
    });
}


function requireAuth(allowedRoles, callback) {
  auth.onAuthStateChanged(function(user) {
    if (!user) {
      window.location = "login.html";
      return;
    }
    
    db.ref("users/" + user.uid).once("value")
      .then(snap => {
        var profile = snap.val();
        if (!profile) {
          // no profile saved -> sign out for safety
          auth.signOut().then(() => window.location = "signup.html");
          return;
        }
        if (allowedRoles && allowedRoles.length && !allowedRoles.includes(profile.role)) {
          // not allowed role
          auth.signOut().then(() => window.location = "verifier-login.html");
          return;
        }
        callback({ user: user, profile: profile });
      })
      .catch(err => {
        console.error("requireAuth DB error:", err);
        window.location = "login.html";
      });
  });
}


function initAuthPages() {
  var signupBtn = qs("#signup-btn");
  if (signupBtn) {
    // Remove any existing listeners and add a new one
    signupBtn.replaceWith(signupBtn.cloneNode(true));
    signupBtn = qs("#signup-btn");
    
    let isSubmitting = false;
    
    signupBtn.addEventListener("click", function() {
      // Prevent multiple simultaneous submissions
      if (isSubmitting) {
        console.log("Signup already in progress...");
        return;
      }
      
      isSubmitting = true;
      signupBtn.disabled = true;
      signupBtn.textContent = "Creating Account...";
      
      var email = qs("#signup-email").value.trim();
      var pass = qs("#signup-password").value.trim();
      var errEl = qs("#signup-error");
      if (errEl) errEl.textContent = "";

      if (!email || pass.length < 6) {
        if (errEl) errEl.textContent = "Provide valid email and password (min 6 chars).";
        isSubmitting = false;
        signupBtn.disabled = false;
        signupBtn.textContent = "Sign Up";
        return;
      }

      auth.createUserWithEmailAndPassword(email, pass)
        .then(cred => {
          console.log("User created:", cred.user.uid);
          // save profile in Realtime DB
          return db.ref("users/" + cred.user.uid).set({
            email: email,
            role: "applicant",
            createdAt: Date.now()
          });
        })
        .then(() => {
          alert("Account created successfully. Please login.");
          window.location.href = "login.html";
        })
        .catch(err => {
          console.error("Signup error:", err);
          if (errEl) errEl.textContent = err.message || "Signup error";
          isSubmitting = false;
          signupBtn.disabled = false;
          signupBtn.textContent = "Sign Up";
        });
    });
  }

  var loginBtn = qs("#login-btn");
  if (loginBtn) {
    // Remove any existing listeners and add a new one
    loginBtn.replaceWith(loginBtn.cloneNode(true));
    loginBtn = qs("#login-btn");
    
    let isLoggingIn = false;
    
    loginBtn.addEventListener("click", function() {
      if (isLoggingIn) return;
      
      isLoggingIn = true;
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
      
      var email = qs("#login-email").value.trim();
      var pass = qs("#login-password").value.trim();
      var errEl = qs("#login-error");
      if (errEl) errEl.textContent = "";

      auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
          // Login successful - auth state listener will handle redirect
        })
        .catch(err => {
          if (errEl) errEl.textContent = err.message || "Login failed";
          isLoggingIn = false;
          loginBtn.disabled = false;
          loginBtn.textContent = "Login";
        });
    });
  }

  var verifierBtn = qs("#verifier-btn");
  if (verifierBtn) {
    // Remove any existing listeners and add a new one
    verifierBtn.replaceWith(verifierBtn.cloneNode(true));
    verifierBtn = qs("#verifier-btn");
    
    let isVerifierLoggingIn = false;
    
    verifierBtn.addEventListener("click", function() {
      if (isVerifierLoggingIn) return;
      
      isVerifierLoggingIn = true;
      verifierBtn.disabled = true;
      verifierBtn.textContent = "Logging in...";
      
      var email = qs("#verifier-email").value.trim();
      var pass = qs("#verifier-password").value.trim();
      var errEl = qs("#verifier-error");
      if (errEl) errEl.textContent = "";

      auth.signInWithEmailAndPassword(email, pass)
        .then(cred => {
          return db.ref("users/" + cred.user.uid).once("value");
        })
        .then(snap => {
          var profile = snap.val();
          if (!profile || (profile.role !== "verifier" && profile.role !== "admin")) {
            auth.signOut().then(() => {
              if (errEl) errEl.textContent = "Restricted to verifier/admin accounts.";
              isVerifierLoggingIn = false;
              verifierBtn.disabled = false;
              verifierBtn.textContent = "Login";
            });
            return;
          }
          // Login successful - auth state listener will handle redirect
        })
        .catch(err => {
          if (errEl) errEl.textContent = err.message || "Login failed";
          isVerifierLoggingIn = false;
          verifierBtn.disabled = false;
          verifierBtn.textContent = "Login";
        });
    });
  }
}

// applicant dashboard 
function loadApplicantDashboard() {
  var historyBody = qs("#history-body");
  var submitForm = qs("#submit-form");
  var submitCard = qs("#submit-card");
  var activeMsg = qs("#active-msg");
  if (!historyBody || !submitForm) return;

  requireAuth(["applicant"], function({ user, profile }) {
    qs("#welcome") && (qs("#welcome").textContent = "Welcome, " + profile.email);
    
    // show user's submissions
    db.ref("applications").orderByChild("applicantId").equalTo(user.uid).once("value")
      .then(snap => {
        historyBody.innerHTML = "";
        var hasActive = false;
        snap.forEach(child => {
          var a = child.val();
          var tr = document.createElement("tr");
          tr.innerHTML = "<td>" + a.fullName + "</td>"
                       + "<td>" + a.email + "</td>"
                       + "<td>" + a.docType + "</td>"
                       + "<td><span class='badge " + a.status + "'>" + a.status + "</span></td>"
                       + "<td>" + (a.verifierRemarks || "-") + "</td>"
                       + "<td>" + (a.createdAt ? new Date(a.createdAt).toLocaleString() : "-") + "</td>";
          historyBody.appendChild(tr);
          if (a.status === "pending" || a.status === "info_requested") hasActive = true;
        });
        submitCard.style.display = hasActive ? "none" : "block";
        activeMsg.style.display = hasActive ? "block" : "none";
      });

    // submit metadata only
    submitForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var fullName = qs("#fullName").value.trim();
      var email = qs("#email").value.trim();
      var docType = qs("#docType").value;
      var errorEl = qs("#submit-error");
      if (errorEl) errorEl.textContent = "";

      if (!fullName || !email || !docType) {
        if (errorEl) errorEl.textContent = "Please fill all fields.";
        return;
      }

      if (!validateEmail(email)) {
        if (errorEl) errorEl.textContent = "Please provide a valid email address.";
        return;
      }

      var app = {
        applicantId: user.uid,
        fullName: fullName,
        email: email,
        docType: docType,
        status: "pending",
        createdAt: Date.now(),
        verifierRemarks: ""
      };

      db.ref("applications").push(app)
        .then(() => { 
          alert("Application submitted successfully"); 
          window.location.reload(); 
        })
        .catch(err => { 
          if (errorEl) errorEl.textContent = err.message || "Submission failed"; 
        });
    });
  });
}

/* =========================
   Verifier Dashboard
   ========================= */
function loadVerifierDashboard() {
  var pendingBody = qs("#pending-body");
  if (!pendingBody) return;

  requireAuth(["verifier", "admin"], function({ user, profile }) {
    qs("#welcome-verifier") && (qs("#welcome-verifier").textContent = profile.email + " (" + profile.role + ")");

    function refresh() {
      db.ref("applications").once("value")
        .then(snap => {
          pendingBody.innerHTML = "";
          var qStatus = qs("#filter-status") ? qs("#filter-status").value : "";
          var qDoc = qs("#filter-doc") ? qs("#filter-doc").value : "";
          var qSearch = qs("#search-email") ? qs("#search-email").value.toLowerCase() : "";

          snap.forEach(child => {
            var id = child.key;
            var a = child.val();

            // default: only actionable statuses if no explicit filter
            if (!qStatus) {
              if (!["pending","info_requested"].includes(a.status)) return;
            } else {
              if (a.status !== qStatus) return;
            }

            if (qDoc && a.docType !== qDoc) return;
            if (qSearch && !a.email.toLowerCase().includes(qSearch)) return;

            var tr = document.createElement("tr");
            tr.innerHTML = "<td>" + a.fullName + "</td>"
                         + "<td>" + a.email + "</td>"
                         + "<td>" + a.docType + "</td>"
                         + "<td><span class='badge " + a.status + "'>" + a.status + "</span></td>"
                         + "<td>" + (a.fileName || "-") + "</td>"
                         + "<td><input class='remark-input' data-id='" + id + "' value='" + (a.verifierRemarks || "") + "'></td>"
                         + "<td>"
                         + "<button class='btn' data-act='verify' data-id='" + id + "'>Verify</button>"
                         + "<button class='btn danger' data-act='reject' data-id='" + id + "'>Reject</button>"
                         + "<button class='btn warn' data-act='info' data-id='" + id + "'>Request Info</button>"
                         + "</td>";
            pendingBody.appendChild(tr);
          });
        });
    }

    // wire filters & search
    if (qs("#filter-status")) qs("#filter-status").addEventListener("change", refresh);
    if (qs("#filter-doc")) qs("#filter-doc").addEventListener("change", refresh);
    if (qs("#search-email")) qs("#search-email").addEventListener("input", refresh);

    // actions (event delegation)
    pendingBody.addEventListener("click", function(e) {
      var btn = e.target.closest("button[data-act]");
      if (!btn) return;
      var id = btn.dataset.id;
      var act = btn.dataset.act;
      var remarkEl = qs(".remark-input[data-id='" + id + "']");
      var remarks = remarkEl ? remarkEl.value.trim() : "";

      var newStatus = act === "verify" ? "verified" : act === "reject" ? "rejected" : "info_requested";
      var update = { status: newStatus, verifierId: user.uid, verifierRemarks: remarks };
      if (newStatus === "verified") update.verifiedAt = Date.now(); else update.verifiedAt = null;

      db.ref("applications/" + id).update(update).then(refresh);
    });

    refresh();
  });
}

/* =========================
   Admin Panel
   ========================= */
function loadAdminPanel() {
  if (!qs("#welcome-admin")) return;

  requireAuth(["admin"], function({ profile }) {
    qs("#welcome-admin").textContent = "Admin: " + profile.email;

    // KPIs
    db.ref("users").once("value").then(uSnap => {
      qs("#kpi-users").textContent = uSnap ? uSnap.numChildren() : 0;
    });
    db.ref("applications").once("value").then(aSnap => {
      var active = 0, verified = 0;
      aSnap.forEach(c => {
        var a = c.val();
        if (["pending","info_requested"].includes(a.status)) active++;
        if (a.status === "verified") verified++;
      });
      qs("#kpi-active").textContent = active;
      qs("#kpi-verified").textContent = verified;
    });

    // Users list
    var usersBody = qs("#users-body");
    if (usersBody) {
      db.ref("users").once("value").then(snap => {
        usersBody.innerHTML = "";
        snap.forEach(child => {
          var id = child.key;
          var u = child.val();
          var tr = document.createElement("tr");
          tr.innerHTML = "<td>" + u.email + "</td>"
                       + "<td>" + u.role + "</td>"
                       + "<td><select data-id='" + id + "' class='role-select'><option value='applicant'>Applicant</option><option value='verifier'>Verifier</option><option value='admin'>Admin</option></select></td>"
                       + "<td><button class='btn danger' data-del='" + id + "'>Delete</button></td>";
          usersBody.appendChild(tr);
          // set selected option
          var sel = usersBody.querySelector("select[data-id='" + id + "']");
          if (sel) sel.value = u.role || "applicant";
        });

        // role change / delete handlers
        usersBody.addEventListener("change", function(e) {
          var sel = e.target.closest(".role-select");
          if (!sel) return;
          db.ref("users/" + sel.dataset.id).update({ role: sel.value }).then(loadAdminPanel);
        });
        usersBody.addEventListener("click", function(e) {
          var del = e.target.closest("button[data-del]");
          if (!del) return;
          if (!confirm("Are you sure you want to delete this user?")) return;
          db.ref("users/" + del.dataset.del).remove().then(loadAdminPanel);
        });
      });
    }
  });
}

/* =========================
   Init on DOM ready
   ========================= */
document.addEventListener("DOMContentLoaded", function() {
  // Initialize auth state listener
  initAuthStateListener();

  // wire global logout links
  qsa("[data-logout]").forEach(btn => btn.addEventListener("click", signOut));

  // init pages
  initAuthPages();
  loadApplicantDashboard();
  loadVerifierDashboard();
  loadAdminPanel();

  // small nav toggle (present on pages)
  var toggle = qs("#nav-toggle"), menu = qs("#nav-menu");
  if (toggle && menu) toggle.addEventListener("click", function(){ menu.classList.toggle("active"); });
});