// routes/authors.js
const express = require('express');
const router = express.Router();
const { getConnection } = require('../db'); // Путь к вашей функции подключения

// Получение списка авторов
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT id, profileName, profilePicture, Description FROM Users'); // Измените запрос по необходимости
    res.json(result.recordset); // Возвращаем авторов в формате JSON
  } catch (err) {
    console.error('Ошибка при получении авторов:', err);
    res.status(500).send('Ошибка при получении авторов');
  }
});

module.exports = router;
