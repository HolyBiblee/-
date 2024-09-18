// app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
require('./config/passport')(passport);  // Ensure passport configuration is loaded

const app = express();

// Настройка сессий
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Установите `true` при использовании HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Настройка представлений
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для обработки JSON и URL-encoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Использование маршрутов (включая все аутентификационные маршруты в index.js)
app.use('/', require('./routes/index'));

// Обработка 404 ошибок
app.use((req, res, next) => {
  res.status(404).send('Страница не найдена');
});

app.use((req, res, next) => {
  res.locals.user = req.user; // Делает текущего пользователя доступным в шаблонах
  next();
});

module.exports = app;
