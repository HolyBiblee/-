const express = require('express');
const path = require('path');
const session = require('express-session');
const indexRouter = require('./routes/index'); // Подключите маршруты

const app = express();

// Настройка сессий
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Настройка представлений
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'public')));

// Использование маршрутов
app.use('/', indexRouter);

// Обработка 404 ошибок
app.use((req, res, next) => {
  res.status(404).send('Страница не найдена');
});

module.exports = app;
