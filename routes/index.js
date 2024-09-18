const express = require('express');
const router = express.Router();
const passport = require('passport');
const { getConnection } = require('../db');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const { getUserById } = require('../models/User');
const { ensureGuest, ensureAuth } = require('../middleware/authMiddleware');

// Функция проверки аутентификации
const isAuthenticated = (req) => {
  return req.session && req.session.isAuthenticated;
};

// Главная страница
router.get('/', (req, res) => {
  res.render('index', { title: 'Главная', user: req.user });
});

// Маршрут для страницы "Изучить"
router.get('/explore', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Creators');
    res.render('explore', { title: 'Изучить', authors: result.recordset, user: req.user });
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Ошибка при получении данных');
  }
});

// Страница мессенджера
router.get('/messages', (req, res) => {
  res.render('messages', { title: 'Мессенджер', user: req.user });
});

// Страница профиля
router.get('/profile', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  
  try {
    const userId = req.user.id; // Получаем ID пользователя из сессии
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, userId)
      .query('SELECT * FROM Users WHERE id = @id');
    
    const user = result.recordset[0];
    res.render('profile', { title: 'Профиль', user });
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).send('Ошибка при получении данных пользователя');
  }
});


// Регистрация (доступна только для неавторизованных пользователей)
router.get('/register', ensureGuest, (req, res) => {
  res.render('register', { title: 'Регистрация' });
});

// Логика регистрации
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  console.log(`Регистрация пользователя: ${username}, ${email}`);

  try {
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`Хешированный пароль для ${username}: ${hashedPassword}`);

    // Получение подключения к базе данных
    const pool = await getConnection();
    console.log('Подключение к базе данных успешно.');

    // Добавление пользователя в базу данных
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .input('PasswordHash', sql.VarChar, hashedPassword)  // Передаем хешированный пароль
      .query('INSERT INTO Users (username, email, PasswordHash) VALUES (@username, @email, @PasswordHash)');

    console.log(`Пользователь ${username} успешно зарегистрирован.`);

    res.redirect('/login');
  } catch (err) {
    console.error('Ошибка при регистрации пользователя:', err);
    res.status(500).send('Ошибка при регистрации');
  }
});


// Вход (доступен только для неавторизованных пользователей)
router.get('/login', ensureGuest, (req, res) => {
  res.render('login', { title: 'Вход' });
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
