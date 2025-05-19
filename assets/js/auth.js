const API_URL = 'http://localhost:3000/api';
const RECENT_USERS_KEY = 'recentUsers';

// Validation functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^\d{10,13}$/.test(phone);
}

function isValidReferralCode(code) {
    return !code || (typeof code === 'string' && code.length <= 8);
}

function validateRegistration(data) {
    if (!data.username || !data.password || !data.email || !data.phone) {
        return 'All fields are required';
    }

    if (data.username.length > 16) {
        return 'Username must be max 16 characters';
    }

    if (data.password.length < 8 || data.password.length > 12) {
        return 'Password must be 8-12 characters';
    }

    if (!isValidEmail(data.email)) {
        return 'Invalid email format';
    }

    if (!isValidPhone(data.phone)) {
        return 'Phone number must be 10-13 digits';
    }

    if (!isValidReferralCode(data.referralCode)) {
        return 'Referral code must be max 8 characters';
    }

    return null;
}

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
        loadRecentUsers();
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs[1].classList.add('active');
    }
}

function loadRecentUsers() {
    const recentUsers = JSON.parse(localStorage.getItem(RECENT_USERS_KEY) || '[]');
    const recentUsersDiv = document.getElementById('recentUsers');
    const recentUsersList = document.querySelector('.recent-users-list');

    if (recentUsers.length === 0) {
        recentUsersDiv.classList.add('d-none');
        return;
    }

    recentUsersList.innerHTML = '';
    recentUsers.forEach(username => {
        const userItem = document.createElement('div');
        userItem.className = 'recent-user-item';
        userItem.innerHTML = `<i class="bi bi-person-circle"></i>${username}`;
        userItem.onclick = () => {
            document.getElementById('loginUsername').value = username;
            document.getElementById('loginPassword').focus();
        };
        recentUsersList.appendChild(userItem);
    });

    recentUsersDiv.classList.remove('d-none');
}

function addRecentUser(username) {
    const recentUsers = JSON.parse(localStorage.getItem(RECENT_USERS_KEY) || '[]');
    const updatedUsers = [username, ...recentUsers.filter(u => u !== username)].slice(0, 5);
    localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(updatedUsers));
}

function showMessage(formId, message, isError = false) {
    const messageDiv = document.getElementById(formId + 'Message');
    messageDiv.textContent = message;
    messageDiv.className = `alert ${isError ? 'alert-danger' : 'alert-success'}`;
    messageDiv.classList.remove('d-none');
}

document.addEventListener('DOMContentLoaded', function() {
    // Test koneksi database
    fetch(`${API_URL}/test-connection`)
        .then(response => response.json())
        .then(data => console.log('Database connection:', data.status))
        .catch(err => console.error('Database connection error:', err));

    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            username: form.regUsername.value.trim(),
            password: form.regPassword.value,
            email: form.regEmail.value.trim(),
            phone: form.regPhone.value.trim(),
            referralCode: form.refCode.value.trim()
        };

        // Client-side validation
        const validationError = validateRegistration(data);
        if (validationError) {
            showMessage('register', validationError, true);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
                showMessage('register', result.error || 'Server error, please try again later.', true);
                return;
            }

            const result = await response.json();
            document.getElementById('generatedRefCode').textContent = result.referralCode;
            document.getElementById('referralCode').classList.add('show');
            showMessage('register', 'Registration successful! Please log in.');
            form.reset();
            setTimeout(() => switchTab('login'), 2000);
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('register', 'Unable to connect to server. Please check your internet connection and try again.', true);
        }
    });

    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            username: form.loginUsername.value,
            password: form.loginPassword.value
        };

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
                showMessage('login', result.error || 'Invalid credentials', true);
                return;
            }

            const result = await response.json();
            addRecentUser(data.username);
            showMessage('login', 'Login successful!');
            localStorage.setItem('user', JSON.stringify(result));
            setTimeout(() => window.location.href = 'index.html', 1000);
        } catch (error) {
            console.error('Login error:', error);
            showMessage('login', 'Unable to connect to server. Please check your internet connection and try again.', true);
        }
    });

    loadRecentUsers();

    // Add input validation listeners
    document.getElementById('regUsername').addEventListener('input', function(e) {
        if (this.value.length > 16) {
            this.value = this.value.slice(0, 16);
            showMessage('register', 'Username must be max 16 characters', true);
        }
    });

    document.getElementById('regPassword').addEventListener('input', function(e) {
        if (this.value.length > 12) {
            this.value = this.value.slice(0, 12);
            showMessage('register', 'Password must be 8-12 characters', true);
        }
    });

    document.getElementById('regPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^\d]/g, '');
        if (this.value.length > 13) {
            this.value = this.value.slice(0, 13);
            showMessage('register', 'Phone number must be 10-13 digits', true);
        }
    });

    document.getElementById('refCode').addEventListener('input', function(e) {
        if (this.value.length > 8) {
            this.value = this.value.slice(0, 8);
            showMessage('register', 'Referral code must be max 8 characters', true);
        }
    });
});
