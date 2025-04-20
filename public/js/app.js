// Connect to Socket.io server
const socket = io();

// DOM Elements
const roomNameElement = document.getElementById('room-name');
const clientCountElement = document.getElementById('client-count');
const sharedTextElement = document.getElementById('shared-text');
const changeRoomBtn = document.getElementById('change-room-btn');
const claimRoomBtn = document.getElementById('claim-room-btn');
const authBtn = document.getElementById('auth-btn');
const showHistoryBtn = document.getElementById('show-history-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Dialogs
const roomDialog = document.getElementById('room-dialog');
const authDialog = document.getElementById('auth-dialog');
const historyDialog = document.getElementById('history-dialog');
const newRoomNameInput = document.getElementById('new-room-name');
const cancelRoomChangeBtn = document.getElementById('cancel-room-change');
const confirmRoomChangeBtn = document.getElementById('confirm-room-change');

// Auth dialog elements
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const backToLoginBtn = document.getElementById('back-to-login');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const forgotEmailInput = document.getElementById('forgot-email');
const cancelLoginBtn = document.getElementById('cancel-login');
const confirmLoginBtn = document.getElementById('confirm-login');
const cancelSignupBtn = document.getElementById('cancel-signup');
const confirmSignupBtn = document.getElementById('confirm-signup');
const sendResetBtn = document.getElementById('send-reset');

// History dialog elements
const historyList = document.getElementById('history-list');
const closeHistoryBtn = document.getElementById('close-history');

// Toast notification
const toast = document.getElementById('toast');

// Get current room name from URL
const currentRoom = roomNameElement.textContent.trim();

// Connect to the room
socket.emit('join-room', currentRoom);

// Event Listeners
sharedTextElement.addEventListener('input', debounce(function() {
  const text = sharedTextElement.value;
  socket.emit('text-update', text);
}, 100));

// Handle room change dialog
changeRoomBtn.addEventListener('click', () => {
  openDialog(roomDialog);
  newRoomNameInput.value = currentRoom;
  newRoomNameInput.focus();
  newRoomNameInput.select();
});

cancelRoomChangeBtn.addEventListener('click', () => {
  closeDialog(roomDialog);
});

confirmRoomChangeBtn.addEventListener('click', () => {
  const newRoomName = newRoomNameInput.value.trim();
  if (newRoomName) {
    window.location.href = `/${encodeURIComponent(newRoomName)}`;
  }
});

// Room name click event
roomNameElement.addEventListener('click', () => {
  openDialog(roomDialog);
  newRoomNameInput.value = currentRoom;
  newRoomNameInput.focus();
  newRoomNameInput.select();
});

// Submit room dialog on Enter key
newRoomNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    confirmRoomChangeBtn.click();
  }
});

// Theme toggle
themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  
  // Save preference to localStorage
  const isDarkMode = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
});

// Initialize theme from localStorage
function initTheme() {
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme === 'true') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// Claim room button
if (claimRoomBtn) {
  claimRoomBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomName: currentRoom })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Room claimed successfully!', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast(data.message, 'error');
      }
    } catch (error) {
      console.error('Error claiming room:', error);
      showToast('Failed to claim room. Please try again.', 'error');
    }
  });
}

// Auth button
if (authBtn) {
  authBtn.addEventListener('click', () => {
    openDialog(authDialog);
    loginEmailInput.focus();
  });
}

// Auth dialog tabs
loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
  forgotPasswordForm.classList.add('hidden');
});

signupTab.addEventListener('click', () => {
  loginTab.classList.remove('active');
  signupTab.classList.add('active');
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
  forgotPasswordForm.classList.add('hidden');
});

// Forgot password link
forgotPasswordLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  forgotPasswordForm.classList.remove('hidden');
  forgotEmailInput.focus();
});

// Back to login button
backToLoginBtn.addEventListener('click', () => {
  forgotPasswordForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  loginEmailInput.focus();
});

// Cancel auth buttons
cancelLoginBtn.addEventListener('click', () => {
  closeDialog(authDialog);
});

cancelSignupBtn.addEventListener('click', () => {
  closeDialog(authDialog);
});

// Login form submission
confirmLoginBtn.addEventListener('click', async () => {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  
  if (!email || !password) {
    showToast('Please enter both email and password', 'warning');
    return;
  }
  
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        password,
        roomName: currentRoom
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      closeDialog(authDialog);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed. Please try again.', 'error');
  }
});

// Signup form submission
confirmSignupBtn.addEventListener('click', async () => {
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  
  if (!email || !password) {
    showToast('Please enter both email and password', 'warning');
    return;
  }
  
  try {
    const response = await fetch('/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        password,
        roomName: currentRoom
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      closeDialog(authDialog);
      
      // No need to reload here as the user still needs to verify email
      // After email verification, they will be redirected properly
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('Signup error:', error);
    showToast('Signup failed. Please try again.', 'error');
  }
});

// Reset password request
sendResetBtn.addEventListener('click', async () => {
  const email = forgotEmailInput.value.trim();
  
  if (!email) {
    showToast('Please enter your email', 'warning');
    return;
  }
  
  try {
    const response = await fetch('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      closeDialog(authDialog);
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    showToast('Password reset request failed. Please try again.', 'error');
  }
});

// Show history
if (showHistoryBtn) {
  showHistoryBtn.addEventListener('click', async () => {
    try {
      const response = await fetch(`/${currentRoom}/history`);
      const data = await response.json();
      
      if (data.success) {
        renderHistoryList(data.history);
        openDialog(historyDialog);
      } else {
        showToast(data.message, 'error');
      }
    } catch (error) {
      console.error('Get history error:', error);
      showToast('Failed to load history. Please try again.', 'error');
    }
  });
}

// Close history dialog
closeHistoryBtn.addEventListener('click', () => {
  closeDialog(historyDialog);
});

// Socket.io event handlers
socket.on('client-count', (count) => {
  clientCountElement.textContent = count;
  
  // Animate the count change
  clientCountElement.classList.add('fade-in');
  setTimeout(() => {
    clientCountElement.classList.remove('fade-in');
  }, 500);
});

socket.on('text-update', (text) => {
  sharedTextElement.value = text;
});

socket.on('room-status', (data) => {
  if (data.canAccess) {
    // If we have last text, update the textarea
    if (data.lastText) {
      sharedTextElement.value = data.lastText;
      socket.emit('text-update', data.lastText); // Broadcast to other clients in the room
    }
  } else {
    // Redirect to default room if can't access
    window.location.href = '/';
  }
});

// Functions
function openDialog(dialog) {
  dialog.classList.add('visible');
}

function closeDialog(dialog) {
  dialog.classList.remove('visible');
}

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = 'toast visible';
  toast.classList.add(type);
  
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

function renderHistoryList(history) {
  historyList.innerHTML = '';
  
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-item"><p>No history found.</p></div>';
    return;
  }
  
  history.forEach(item => {
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleString();
    
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    historyItem.innerHTML = `
      <div class="history-item-header">
        <span>${formattedDate}</span>
      </div>
      <div class="history-item-text">${item.text}</div>
    `;
    
    historyItem.addEventListener('click', () => {
      sharedTextElement.value = item.text;
      socket.emit('text-update', item.text);
      closeDialog(historyDialog);
    });
    
    historyList.appendChild(historyItem);
  });
}

// Debounce function to limit how often text updates are sent
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  // Check URL for claim parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('claim') === 'true' && claimRoomBtn) {
    claimRoomBtn.click();
  }
});