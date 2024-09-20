const express = require('express');
const router = express.Router();
const passport = require('passport');
const { getConnection } = require('../db');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const { getUserById } = require('../models/User');
const { ensureGuest, ensureAuth } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: 'public/uploads' }); // Путь для сохранения файлов


// Удаление поста
router.post('/post/delete/:id', async (req, res) => {
  console.log('Попытка удалить пост с ID:', req.params.id); // Логирование попытки удаления
 
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  const postId = req.params.id;
console.log('Deleting post with ID:', postId);
  try {
    const pool = await getConnection();
    await pool.request()
      .input('postId', sql.Int, postId)
      .query('DELETE FROM Posts WHERE id = @postId');

    res.redirect('/profile'); // Перенаправление на страницу профиля после удаления
    

  } catch (err) {
    console.error('Ошибка при удалении поста:', err);
    res.status(500).send('Ошибка при удалении поста');
  }
});



// Путь для загрузки контента в профиль
router.post('/upload', upload.single('media'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  const userId = req.user.Id;
  const { caption } = req.body;
  const mediaType = req.file.mimetype.startsWith('image') ? 'photo' : 'video';
  const mediaPath = '/uploads/' + req.file.filename; // или другой способ формирования пути
  


  try {
    const pool = await getConnection();
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('mediaType', sql.NVarChar, mediaType)
      .input('mediaPath', sql.NVarChar, mediaPath)
      .input('caption', sql.NVarChar, caption)
      .query(`
        INSERT INTO Posts (userId, mediaType, mediaPath, caption)
        VALUES (@userId, @mediaType, @mediaPath, @caption)
      `);

    res.redirect('/profile');
  } catch (err) {
    console.error('Ошибка при загрузке контента:', err);
    res.status(500).send('Ошибка при загрузке контента');
  }
});


// Настройка хранения загруженных файлов с помощью multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // Путь к папке для хранения изображений
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
  }
});



router.post('/login', passport.authenticate('local', {
  successRedirect: '/profile',
  failureRedirect: '/login',
  failureFlash: true
}), (req, res) => {

});

// Маршрут для редактирования профиля
router.post('/profile/edit', upload.single('profilePicture'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  const userId = req.user.Id; // ID текущего пользователя

  // Получаем данные из формы
  const { username, email, description, profileName } = req.body; // Добавляем profileName
  let profilePicture = req.file ? req.file.path.replace(/\\/g, '/') : null;

  // Если нет нового файла, сохраняем старое значение
  if (!profilePicture) {
      const result = await pool.request()
          .input('id', sql.Int, userId)
          .query('SELECT profilePicture FROM Users WHERE id = @id');
      profilePicture = result.recordset[0].profilePicture;
  }
 

  try {
    const pool = await getConnection();
    
    // Выполняем запрос на обновление данных
    await pool.request()
      .input('id', sql.Int, userId)
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('description', sql.NVarChar, description)
      .input('profileName', sql.NVarChar, profileName) // Добавляем input для profileName
      .input('profilePicture', sql.NVarChar, profilePicture)
      .query(`
        UPDATE Users
        SET email = @email,
            Description = @description,
            profilePicture = @profilePicture,
            profileName = @profileName
        WHERE id = @id
      `);

    res.redirect('/profile');
  } catch (err) {
    console.error('Ошибка при обновлении профиля:', err);
    res.status(500).send('Ошибка при обновлении профиля');
  }
});




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

  const userId = req.user.Id; // Получаем ID пользователя из сессии

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, userId)
      .query('SELECT id, username, email, Description, profilePicture, profileName FROM Users WHERE id = @id');

    const user = result.recordset[0];

    // Получение постов пользователя
    const posts = await pool.request()
    .input('userId', sql.Int, userId)
    .query('SELECT id, mediaType, mediaPath, caption FROM Posts WHERE userId = @userId');


    // Удаляем 'public/' из mediaPath
    posts.recordset.forEach(post => {
      post.mediaPath = post.mediaPath.replace('public/', '');
    });

    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    res.render('profile', { title: 'Профиль', user, posts: posts.recordset });
  } catch (err) {
    console.error('Ошибка при получении данных пользователя:', err);
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



  try {
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);


    // Получение подключения к базе данных
    const pool = await getConnection();


    // Добавление пользователя в базу данных
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .input('PasswordHash', sql.VarChar, hashedPassword)  // Передаем хешированный пароль
      .query('INSERT INTO Users (username, email, PasswordHash) VALUES (@username, @email, @PasswordHash)');


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
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) {
      return next(err); // Если произошла ошибка, передаем её в следующий middleware
    }
    res.redirect('/'); // Если всё прошло успешно, редирект на главную страницу
  });
});


module.exports = router;
