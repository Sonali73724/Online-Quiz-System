const express = require('express');
const router = express.Router();
const pool = require('./conn');
router.get('/dashboard', async (req, res) => {
    const [total_quizes] = await pool.execute('SELECT COUNT(*) as total_quizes FROM quizzes');
    const [total_students] = await pool.execute('SELECT COUNT(*) as total_students FROM users');
    const [total_attempts] = await pool.execute('SELECT count(*) as total_attempts FROM quiz_results');
    console.log(total_quizes, total_students, total_attempts);
    res.render('admin-dashboard', { total_quizes, total_students, total_attempts });
});

router.get('/add-quizes', (req, res) => {
  res.render('add-quizes');
});

router.get('/add-question', (req, res) => {
  res.render('add-question');
});

router.get('/select-questions', (req, res) => {
  res.render('select-questions');
});

router.get('/view-student', async (req, res) => {
    const [students] = await pool.execute('SELECT * FROM users');
    res.render('view-student', { students });
});
router.get('/view-result', async (req, res) => {
    const [results] = await pool.execute('SELECT * FROM quiz_results join users on quiz_results.user_id=users.id');
    res.render('view-result', { results });
});
router.get('/add-test-series', (req, res) => {
  res.render('add-quizes');
});

router.post('/add-question', async (req, res) => {
    const { question, 'option-a': optionA, 'option-b': optionB, 'option-c': optionC, 'option-d': optionD, 'correct-answer': correctAnswer } = req.body;

    try {
        const [result] = await pool.execute(
            'INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?)',
            [question, optionA, optionB, optionC, optionD, correctAnswer]
        );

        res.json({ success: true, message: 'Question added successfully' });
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ success: false, message: 'Error adding question' });
    }
});

router.post('/add-quiz', async (req, res) => {
    const { name, duration } = req.body;

    try {
        const [result] = await pool.execute(
            'INSERT INTO quizzes (name, duration) VALUES (?, ?)',
            [name, duration]
        );

        res.redirect(`/admin/select-questions/${result.insertId}`);
    } catch (error) {
        console.error('Error adding quiz:', error);
        res.status(500).send('Error adding quiz');
    }
});



router.post('/save-quiz-questions/:quizId', async (req, res) => {
    const quizId = req.params.quizId;
    const { questionIds } = req.body;

    try {
                await pool.execute('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);

        // Then, insert the new selected questions
        for (const questionId of questionIds) {
            await pool.execute('INSERT INTO quiz_questions (quiz_id, question_id) VALUES (?, ?)', [quizId, questionId]);
        }

        res.json({ success: true, message: 'Questions saved successfully' });
    } catch (error) {
        console.error('Error saving quiz questions:', error);
        res.status(500).json({ success: false, message: 'Error saving quiz questions' });
    }
});



router.get('/quiz-list', async (req, res) => {
    try {
        const [quizzes] = await pool.execute(`
            SELECT q.id, q.name, q.duration, COUNT(qq.question_id) as question_count
            FROM quizzes q
            LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
            GROUP BY q.id
        `);
        res.render('quiz-list', { quizzes });
    } catch (error) {
        console.error('Error fetching quiz list:', error);
        res.status(500).send('Error fetching quiz list');
    }
});

router.delete('/delete-quiz/:quizId', async (req, res) => {
    const quizId = req.params.quizId;

    try {
        await pool.execute('DELETE FROM quizzes WHERE id =?', [quizId]);
        res.json({ success: true, message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).send('Error deleting quiz');
    }
});


router.get('/select-questions/:quizId', async (req, res) => {
    const quizId = req.params.quizId;

    try {
        const [questions] = await pool.execute('SELECT * FROM questions');
        const [quiz] = await pool.execute('SELECT * FROM quizzes WHERE id = ?', [quizId]);

        res.render('select-questions', { questions, quiz: quiz[0] });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).send('Error fetching questions');
    }
});


module.exports = router;