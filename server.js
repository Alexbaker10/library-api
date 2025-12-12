const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'super_secret_library_key';

app.use(express.json());
app.use(cors());

const db = new sqlite3.Database('./library.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the library database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user' 
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        author TEXT,
        available INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        book_id INTEGER,
        date_reserved TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(book_id) REFERENCES books(id)
    )`);
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

const requireLibrarian = (req, res, next) => {
    if (req.user.role !== 'librarian') {
        return res.status(403).json({ error: 'Access denied. Librarian role required.' });
    }
    next();
};

app.post('/api/auth/register', async (req, res) => {
    const { name, password, role } = req.body;
    
    if (!name || !password) return res.status(400).json({ error: 'Name and password required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'librarian' ? 'librarian' : 'user';

    const sql = `INSERT INTO users (name, password, role) VALUES (?, ?, ?)`;
    db.run(sql, [name, hashedPassword, userRole], function(err) {
        if (err) return res.status(400).json({ error: 'User already exists or error occurred' });
        res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { name, password } = req.body;

    db.get(`SELECT * FROM users WHERE name = ?`, [name], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, role: user.role });
    });
});

app.get('/api/books', (req, res) => {
    db.all(`SELECT * FROM books`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ books: rows });
    });
});

app.get('/api/books/:id', (req, res) => {
    db.get(`SELECT * FROM books WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Book not found' });
        res.json(row);
    });
});

app.post('/api/books', authenticateToken, requireLibrarian, (req, res) => {
    const { title, author } = req.body;
    if (!title || !author) return res.status(400).json({ error: 'Title and Author required' });

    const sql = `INSERT INTO books (title, author) VALUES (?, ?)`;
    db.run(sql, [title, author], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, title, author, available: 1 });
    });
});

app.delete('/api/books/:id', authenticateToken, requireLibrarian, (req, res) => {
    db.run(`DELETE FROM books WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Book deleted', changes: this.changes });
    });
});

app.post('/api/reservations', authenticateToken, (req, res) => {
    const { bookId } = req.body;
    const userId = req.user.id;
    const date = new Date().toISOString();

    db.get(`SELECT available FROM books WHERE id = ?`, [bookId], (err, book) => {
        if (!book) return res.status(404).json({ error: 'Book not found' });
        
        const sql = `INSERT INTO reservations (user_id, book_id, date_reserved) VALUES (?, ?, ?)`;
        db.run(sql, [userId, bookId, date], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Reservation created', reservationId: this.lastID });
        });
    });
});

app.get('/api/reservations', authenticateToken, (req, res) => {
    if (req.user.role === 'librarian') {
        const sql = `
            SELECT r.id, u.name as user, b.title as book, r.date_reserved 
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            JOIN books b ON r.book_id = b.id
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        const sql = `
            SELECT r.id, b.title as book, r.date_reserved 
            FROM reservations r
            JOIN books b ON r.book_id = b.id
            WHERE r.user_id = ?
        `;
        db.all(sql, [req.user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

app.delete('/api/reservations/:id', authenticateToken, (req, res) => {
    const reservationId = req.params.id;

    db.get(`SELECT user_id FROM reservations WHERE id = ?`, [reservationId], (err, row) => {
        if (!row) return res.status(404).json({ error: 'Reservation not found' });

        if (req.user.role !== 'librarian' && req.user.id !== row.user_id) {
            return res.status(403).json({ error: 'You can only cancel your own reservations' });
        }

        db.run(`DELETE FROM reservations WHERE id = ?`, [reservationId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Reservation cancelled' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Library API running on http://localhost:${PORT}`);
});