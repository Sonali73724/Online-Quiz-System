const express = require('express');
const router = express.Router();

const pool = require('./conn');
const bcrypt = require('bcrypt');
router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  // Implement login logic here
  // For now, we'll just redirect to the dashboard
  req.session.isAuthenticated = true;
  res.redirect('/admin/dashboard');
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).send('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]= await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    req.session.user_logged_in = true;
    req.session.user_name = name;
    req.session.user_id = result.insertId;
    res.redirect('/quize');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('An error occurred during registration');
  }
});

router.post('/userlogin', async (req, res) => {
  const { email, password } = req.body;
  var query="SELECT * FROM users WHERE email =?";
  var [result] = await pool.query(query, [email]);
  if (result.length >0) {
    const match = await bcrypt.compare(password, result[0].password);
    if (match) {
      req.session.user_logged_in = true;
      req.session.user_name = result[0].name;
      req.session.user_id = result[0].id;
      res.redirect('/quize');
      return;
    } else {
      res.status(400).send('Invalid password');
    }
    } else {
    res.redirect('/auth/login');
    }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;