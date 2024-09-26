const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override'); // Импортируем метод-перекрытие




require('./config/passport')(passport);  // Убедитесь, что конфигурация паспорта загружена

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

// Middleware для обработки JSON и URL-encoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Делает текущего пользователя доступным в шаблонах
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});



// Настройка middleware для переопределения методов
app.use(methodOverride('_method'));

// Настройка представлений
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'public')));

// Использование маршрутов (включая все аутентификационные маршруты в index.js)
app.use('/', require('./routes/index'));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});


// Обработка 404 ошибок
app.use((req, res, next) => {
  res.status(404).send('Страница не найдена)))');
});

module.exports = app;
