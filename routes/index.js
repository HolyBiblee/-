const express = require('express');
const router = express.Router();
const passport = require('passport');
const { getConnection } = require('../db');

// Функция проверки аутентификации
const isAuthenticated = (req) => {
  return req.session && req.session.isAuthenticated;
};

// Главная страница
router.get('/', (req, res) => {
  res.render('index', { title: 'Главная' });
});

// Маршрут для страницы "Изучить"
router.get('/explore', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Creators');
    res.render('explore', { title: 'Изучить', authors: result.recordset });
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Ошибка при получении данных');
  }
});

// Страница мессенджера
router.get('/messages', (req, res) => {
  res.render('messages', { title: 'Мессенджер' });
});

// Страница профиля
router.get('/profile', (req, res) => {
  res.render('profile', { title: 'Профиль' });
});

// Страница регистрации
router.get('/register', (req, res) => {
  res.render('register', { title: 'Регистрация' });
});

router.post('/register', (req, res) => {
  // Добавьте логику регистрации пользователя
  res.redirect('/login');
});

// Страница авторизации
router.get('/login', (req, res) => {
  res.render('login', { title: 'Войти' });
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/profile',
  failureRedirect: '/login',
  failureFlash: true
}));

// Выход
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
