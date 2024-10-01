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
//const upload = multer({ dest: 'public/uploads' }); // Путь для сохранения файлов
const fs = require('fs');

// Настройка хранения загруженных файлов с помощью multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // Путь к папке для хранения изображений
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
  }
});
const upload = multer({ storage: storage });

// Маршрут для страницы профиля
router.get('/profile/:id?', async (req, res) => {
  console.log('Запрос на профиль получен');

  // Получаем ID пользователя из параметров URL или из сессии
  const userId = req.params.id || (req.isAuthenticated() ? req.user.Id : null);
  console.log('Запрос на профиль получен с ID:', userId);
  console.log('req.params:', req.params);
  console.log('isAuthenticated:', req.isAuthenticated());
  console.log('Authenticated user ID:', req.isAuthenticated() ? req.user.Id : 'Not authenticated');

  // Проверка, был ли передан userId
  if (!userId || userId === 'null') {
    return res.status(400).send('ID пользователя не передан или некорректен');
  }

  try {
    console.log('Подключение к базе данных...');
    const pool = await getConnection();
    console.log('Подключение успешно');

    // Получение пользователя из базы данных
    console.log('Запрос пользователя с ID:', userId);
    const result = await pool.request()
      .input('id', sql.Int, userId)
      .query('SELECT id, username, email, Description, profilePicture, profileName FROM Users WHERE id = @id');

    const user = result.recordset[0];
    console.log('Полученные данные пользователя:', user);

    // Проверка, существует ли пользователь
    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    // Получение постов пользователя
    console.log('Запрос постов для пользователя с ID:', userId);
    const posts = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT id, mediaType, mediaPath, caption FROM Posts WHERE userId = @userId');

    // Удаляем 'public/' из mediaPath
    posts.recordset.forEach(post => {
      post.mediaPath = post.mediaPath.replace('public/', '');
    });

    console.log('Полученные посты пользователя:', posts.recordset);

    // Рендерим страницу профиля с передачей currentUser и profileUser
    res.render('profile', { 
      title: 'Профиль', 
      profileUser: user, 
      currentUser: req.user, 
      posts: posts.recordset 
    }); 
  } catch (err) {
    console.error('Ошибка при получении данных пользователя:', err);
    res.status(500).send('Ошибка при получении данных пользователя');
  }
});



// Маршрут для удаления аккаунта
router.post('/delete-account', ensureAuth, async (req, res) => {
  try {
    const pool = await getConnection();
    const userId = req.body.userId; // Убедитесь, что это правильный ID пользователя
    console.log('Попытка удалить аккаунт с ID:', userId);

    // Удаление всех постов пользователя
    console.log('Удаление постов пользователя...');
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM Posts WHERE userId = @userId');
    console.log('Все посты пользователя удалены.');

    // Удаление самого пользователя
    console.log('Удаление пользователя из базы данных...');
    await pool.request()
      .input('id', sql.Int, userId)
      .query('DELETE FROM Users WHERE id = @id');
    console.log('Пользователь успешно удалён.');

    req.logout((err) => {
      if (err) {
        console.error('Ошибка выхода из системы:', err);
        return res.status(500).send('Ошибка сервера');
      }
      console.log('Пользователь вышел из системы.');
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

  const followerId = req.user.Id;  // Используем 'Id'
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




// Вход (доступен только для неавторизованных пользователей)
router.get('/login', ensureGuest, (req, res) => {
  res.render('login', { title: 'Вход' });
});

router.post('/login', 
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
  }),
  (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect(`/profile/${req.user.Id}`);
    }
  }
);

// Маршрут для редактирования профиля
router.post('/profile/edit', upload.single('profilePicture'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  const userId = req.user.Id; // ID текущего пользователя

  // Получаем данные из формы
  const { profileName, email, description } = req.body; // Добавляем profileName
  let profilePicture = req.file ? req.file.path.replace(/\\/g, '/') : null;

  try {
    const pool = await getConnection(); // Перемещаем подключение сюда

    // Если нет нового файла, сохраняем старое значение
    if (!profilePicture) {
      const result = await pool.request()
        .input('id', sql.Int, userId)
        .query('SELECT profilePicture FROM Users WHERE id = @id');
      profilePicture = result.recordset[0].profilePicture;
    }

    // Выполняем запрос на обновление данных
    await pool.request()
      .input('id', sql.Int, userId)
      .input('profileName', sql.NVarChar, profileName)
      .input('email', sql.NVarChar, email)
      .input('description', sql.NVarChar, description)
      .input('profilePicture', sql.NVarChar, profilePicture)
      .query(`
        UPDATE Users
        SET email = @email,
            Description = @description,
            profilePicture = @profilePicture,
            profileName = @profileName
        WHERE id = @id
      `);

    res.redirect(`/profile/${userId}`);
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
    const authorsResult = await pool.request().query('SELECT id, profileName, profilePicture, Description FROM Users'); 
    const authors = authorsResult.recordset;

    console.log('Authors:', authors);

    // Получите рекомендации (например, популярных авторов)
    const recommendationsResult = await pool.request().query('SELECT * FROM Users WHERE isPopular = 1'); 
    const recommendations = recommendationsResult.recordset;

    const recommendationsMessage = recommendations.length === 0 ? 'Рекомендации отсутствуют' : null;
    console.log('Recommendations:', recommendations);

    // Передаем данные в шаблон
    res.render('index', {
      title: 'Главная страница',
      currentUser: req.user, // Если пользователь авторизован
      authors: authors, // Список авторов
      recommendations: recommendations, // Список рекомендаций
      recommendationsMessage, // Сообщение о рекомендациях
      userId: req.user ? req.user.Id : null // Добавляем userId в данные
    });
  } catch (err) {
    console.error('Ошибка получения данных:', err);
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

// routes/index.js
router.post('/login', 
  passport.authenticate('local', {
    successReturnToOrRedirect: true, //  Добавляем параметр
    failureRedirect: '/login',
    failureFlash: true
  }),
);

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
