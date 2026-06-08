const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Database = require('better-sqlite3')
const path = require('path')

const app = express()
const PORT = 3001
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

const db = new Database(path.join(__dirname, 'subscribers.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

const insertSubscriber = db.prepare('INSERT INTO subscribers (email) VALUES (?)')
const insertUser = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
const findUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?')
const findUserById = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?')

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// --- Mailing list ---

app.post('/api/subscribe', (req, res) => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }
  try {
    insertSubscriber.run(email.trim().toLowerCase())
    res.json({ success: true })
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Already subscribed' })
    }
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// --- Auth ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

  try {
    const hash = await bcrypt.hash(password, 10)
    const result = insertUser.run(email.trim().toLowerCase(), hash)
    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: result.lastInsertRowid, email: email.trim().toLowerCase() } })
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Email already in use' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })

  const user = findUserByEmail.get(email.trim().toLowerCase())
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const { userId } = jwt.verify(auth.slice(7), JWT_SECRET)
    const user = findUserById.get(userId)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
g  }
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
