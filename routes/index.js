const express = require('express');
const router = express.Router();
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
    const result = await pool.request().query('SELECT * FROM Creators'); // Замените 'Authors' на название вашей таблицы
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

module.exports = router;
