const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const db = require('./config/database');
const app = express();

// Test koneksi database
db.connect(error => {
    if (error) throw error;
    console.log('Successfully connected to MySQL database.');
});

// Middleware
app.use(cors());
app.use(express.json());

// Inisialisasi tabel
db.query(`
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(16) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(13) UNIQUE NOT NULL,
        referral_code VARCHAR(8) UNIQUE,
        referred_by VARCHAR(8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('Error creating table:', err);
        return;
    }
    console.log('Database initialized successfully');
});

// Validation functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^\d{10,13}$/.test(phone);
}

// Generate referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Register endpoint
app.post('/api/register', async (req, res) => {
    const { username, password, email, phone, referralCode } = req.body;
    
    // Validasi input
    if (!username || !password || !email || !phone) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (username.length > 16) {
        return res.status(400).json({ error: 'Username must be max 16 characters' });
    }

    if (password.length < 8 || password.length > 12) {
        return res.status(400).json({ error: 'Password must be 8-12 characters' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Phone number must be 10-13 digits' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newReferralCode = generateReferralCode();

        // Check referral code
        if (referralCode) {
            const [referrer] = await db.query('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
            if (!referrer.length) {
                return res.status(400).json({ error: 'Invalid referral code' });
            }
        }

        // Insert new user
        await db.query(
            'INSERT INTO users (username, password, email, phone, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, email, phone, newReferralCode, referralCode || null]
        );

        res.json({
            success: true,
            message: 'Registration successful',
            referralCode: newReferralCode
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (error.message.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (error.message.includes('phone')) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
        }
        res.status(500).json({ error: 'Server error, please try again later' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            username: user.username,
            referralCode: user.referral_code
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error, please try again later' });
    }
});

// Get all users (for admin panel)
app.get('/api/users', async (req, res) => {
    try {
        const [users] = await db.promise().query(
            'SELECT id, username, email, phone, referral_code, referred_by, created_at FROM users'
        );
        
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error, please try again later' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
