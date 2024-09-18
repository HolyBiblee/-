const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const sql = require('mssql');  // Убедитесь, что импортировали sql
const { getConnection } = require('../db');

module.exports = function(passport) {
  passport.use(new LocalStrategy(
    async function(username, password, done) {
      try {
        // Получение подключения к базе данных
        const pool = await getConnection();
        
        // Получение пользователя из базы данных
        const result = await pool.request()
          .input('username', sql.VarChar, username)
          .query('SELECT * FROM Users WHERE UserName = @username');
        
        const user = result.recordset[0];
        
        if (!user) {
          return done(null, false, { message: 'Пользователь не найден' });
        }
        
        // Проверка пароля
        const isMatch = await bcrypt.compare(password, user.PasswordHash);

        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Неверный пароль' });
        }
      } catch (err) {
        console.error('Ошибка при аутентификации:', err);
        return done(err);
      }
    }
  ));

  passport.serializeUser(function(user, done) {
    console.log('Сериализация пользователя:', user); // Добавлено для отладки
    // Сериализация пользователя: сохраняем только ID пользователя
    if (user.Id) {
      done(null, user.Id); // Убедитесь, что user.Id существует
    } else {
      done(new Error('User ID не найден для сериализации'));
    }
  });

  passport.deserializeUser(async function(id, done) {
    try {
      console.log('Десериализация пользователя, ID:', id); // Добавлено для отладки
      const pool = await getConnection();
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM Users WHERE Id = @id');
      
      const user = result.recordset[0];
      
      if (user) {
        console.log('Найден пользователь:', user); // Добавлено для отладки
        done(null, user);  // Передаем весь объект пользователя
      } else {
        done(new Error('Пользователь не найден'));
      }
    } catch (err) {
      console.error('Ошибка при десериализации пользователя:', err);
      done(err);
    }
  });
};
