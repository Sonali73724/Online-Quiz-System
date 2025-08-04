const express = require('express');
const session = require('express-session');
const path = require('path');
const adminRouter = require('./routes/admin');
const pool = require('./routes/conn');
const authRouter = require('./routes/auth');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const bcrypt = require('bcrypt');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'xyz123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));
const isAuthenticated = (req, res, next) => {
  if (req.session.is_admin) {
    next();
  } else {
    res.redirect('/admin-login');
  }
};

// Routes
app.use('/auth', authRouter);
app.use('/admin', isAuthenticated, adminRouter);

app.get('/admin-login', async (req, res) => {
  res.render('admin-login');
});

app.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  var query="SELECT * FROM admin WHERE email =?";
  var [result] = await pool.query(query, [email]);
  if (result.length >0) {
    const match = await bcrypt.compare(password, result[0].password);
    if (match) {
      req.session.is_admin = true;
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/admin-login');
    }
  } else {
    res.redirect('/admin-login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Home route
app.get('/', (req, res) => {
    res.render('index', {
        user_logged_in: req.session.user_logged_in || false,
        user_name: req.session.user_name || ''
    });
});



app.get('/my-results', async (req, res) => {
    if (!req.session.user_logged_in) {
        res.redirect('/login');
        return;
    }

    const userId = req.session.user_id;
    try {
        const [results] = await pool.execute(`
            SELECT qr.*, q.name as quiz_name 
            FROM quiz_results qr 
            JOIN quizzes q ON qr.quiz_id = q.id 
            WHERE qr.user_id = ?
            ORDER BY qr.created_at DESC
        `, [userId]);

        res.render('my-results', { user_name: req.session.user_name, results });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).send('Error fetching results');
    }
});


app.get('/login', (req, res) => {
    res.render('login');
});


app.get('/quize', async (req, res) => {
    try {

        const [quizzes] = await pool.execute('SELECT * FROM quizzes');

        const isLoggedIn = req.session.user_logged_in ? true : false; 
        
        res.render('quize', { quizzes, isLoggedIn,  user_logged_in: req.session.user_logged_in || false,
        user_name: req.session.user_name || '' });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).send('Error fetching quizzes');
    }
});

app.get('/quiz/:quizId', async (req, res) => {
  if (!req.session.user_logged_in) {
    res.redirect('/login');
    return;
  }
    const quizId = req.params.quizId;
    try {


        const [questions] = await pool.execute('SELECT * FROM questions join quiz_questions on quiz_questions.question_id=questions.id WHERE quiz_id = ?', [quizId]);

        res.render('quiz', { quizId, questions: JSON.stringify(questions) });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).send('Error fetching questions');
    }
});


app.post('/submit-quiz', async (req, res) => {
    const { quizId, result } = req.body;
    console.log(result);
    
    try {
       
        await pool.execute(
            'INSERT INTO quiz_results (quiz_id, user_id, score, total_questions) VALUES (?, ?, ?, ?)',
            [quizId, req.session.user_id, result.score, result.totalQuestions]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error submitting quiz result:', error);
        res.status(500).json({ success: false, message: 'Error submitting quiz result' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;