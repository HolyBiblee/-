const express = require('express');
const router = express.Router();

// Главная страница
router.get('/', (req, res) => {
  res.render('index', { title: 'Главная' });
});

// Страница Изучить
router.get('/explore', (req, res) => {
  res.render('explore', { title: 'Изучить' });
});

// Страница Мессенджер
router.get('/messages', (req, res) => {
  res.render('messages', { title: 'Мессенджер' });
});

// Страница Профиль
router.get('/profile', (req, res) => {
    res.render('profile', { title: 'Профиль' });
});

module.exports = router;
