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
const fs = require('fs');


// Удаление аккаунта
router.post('/delete-account', async (req, res) => {
  if (!req.user) {
    return res.status(401).send('Вы не авторизованы');
  }

  try {
    const pool = await getConnection();
    const userId = req.user.Id; // Используйте Id вместо id
    console.log('Попытка удалить аккаунт с ID:', userId); // Вывод ID в консоль

    const result = await pool.request()
      .input('id', sql.Int, userId)
      .query('DELETE FROM Users WHERE Id = @id'); // Убедитесь, что здесь тоже используется Id

    console.log('Результат удаления:', result); // Вывод результата запроса

    req.logout((err) => {
      if (err) {
        console.error('Ошибка выхода из системы:', err);
        return res.status(500).send('Ошибка сервера');
      }
      res.redirect('/'); // Перенаправляем на главную страницу
    });
  } catch (err) {
    console.error('Ошибка удаления аккаунта:', err);
    res.status(500).send('Ошибка сервера');
  }
});




// Маршрут для подписки
router.post('/subscribe/:followedId', async (req, res) => {
  if (!req.isAuthenticated()) {
      return res.redirect('/login');
  }

  const followerId = req.user.id;  // Текущий пользователь
  const followedId = req.params.followedId;  // Автор, на которого подписываются

  try {
      const pool = await getConnection();
      await pool.request()
          .input('followerId', sql.Int, followerId)
          .input('followedId', sql.Int, followedId)
          .query('INSERT INTO Subscriptions (followerId, followedId) VALUES (@followerId, @followedId)');
      
      res.redirect('/explore');
  } catch (err) {
      console.error('Ошибка при подписке:', err);
      res.status(500).send('Ошибка при подписке');
  }
});

// Маршрут для отписки
router.post('/unsubscribe/:followedId', async (req, res) => {
  if (!req.isAuthenticated()) {
      return res.redirect('/login');
  }

  const followerId = req.user.id;
  const followedId = req.params.followedId;

  try {
      const pool = await getConnection();
      await pool.request()
          .input('followerId', sql.Int, followerId)
          .input('followedId', sql.Int, followedId)
          .query('DELETE FROM Subscriptions WHERE followerId = @followerId AND followedId = @followedId');
      
      res.redirect('/explore');
  } catch (err) {
      console.error('Ошибка при отписке:', err);
      res.status(500).send('Ошибка при отписке');
  }
});


// Функция поиска
function filterAuthors() {
  const query = document.getElementById('search').value.toLowerCase();
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    const authorName = card.querySelector('h3').textContent.toLowerCase();
    if (authorName.includes(query)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}



// Маршрут для удаления поста
router.post('/post/delete/:id', async (req, res) => {
  const postId = req.params.id;

  try {
    const pool = await getConnection();

    // Получаем информацию о посте, чтобы найти медиафайл
    const result = await pool.request()
      .input('id', sql.Int, postId)
      .query('SELECT mediaPath FROM Posts WHERE id = @id');

    const post = result.recordset[0];

    if (!post) {
      return res.status(404).send('Пост не найден');
    }

    // Удаление файла медиа из файловой системы
    const mediaFilePath = path.join(__dirname, '..', 'uploads', post.mediaPath);
    fs.unlink(mediaFilePath, (err) => {
      if (err) {
        console.error('Ошибка при удалении файла:', err);
      }
    });

    // Удаление поста из базы данных
    await pool.request()
      .input('id', sql.Int, postId)
      .query('DELETE FROM Posts WHERE id = @id');

    res.redirect('/profile'); // Перенаправление на профиль после удаления поста
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

// Маршрут для главной страницы
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();

    // Получите список всех авторов (всех зарегистрированных пользователей)
    const authorsResult = await pool.request().query('SELECT * FROM Users');
    const authors = authorsResult.recordset;

    // Логируем информацию об авторах
    console.log('Authors:', authors);

    // Получите рекомендации (например, популярных авторов)
    const recommendationsResult = await pool.request().query('SELECT * FROM Users WHERE isPopular = 1'); 
    const recommendations = recommendationsResult.recordset;

    // Проверяем, есть ли рекомендации
    const recommendationsMessage = recommendations.length === 0 ? 'Рекомендации отсутствуют' : null;
    console.log('Recommendations:', recommendations); // Логируем рекомендации

    // Передаем данные в шаблон
    res.render('index', {
      title: 'Главная страница',
      user: req.user, // Если пользователь авторизован
      authors: authors, // Список авторов
      recommendations: recommendations, // Список рекомендаций
      recommendationsMessage, // Сообщение о рекомендациях
    });
  } catch (err) {
    console.error('Ошибка получения данных:', err); // Логируем ошибку
    res.status(500).send('Ошибка сервера');
  }
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

  // Устанавливаем isPopular по умолчанию в false
  const isPopular = false;

  try {
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Получение подключения к базе данных
    const pool = await getConnection();

    // Добавление пользователя в базу данных
    await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .input('PasswordHash', sql.VarChar, hashedPassword)  // Передаем хешированный пароль
      .input('isPopular', sql.Bit, isPopular) // Добавляем поле isPopular
      .query('INSERT INTO Users (username, email, PasswordHash, isPopular) VALUES (@username, @email, @PasswordHash, @isPopular)');

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
