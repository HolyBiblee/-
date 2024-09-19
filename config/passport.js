const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const sql = require('mssql');  // Убедитесь, что импортировали sql
const { getConnection } = require('../db');

module.exports = function(passport) {
  passport.use(new LocalStrategy(
    async function(username, password, done) {
      try {
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
    console.log('Сериализация пользователя:', user); // Для отладки
    done(null, user.Id); // Сохраните ID пользователя
  });

  passport.deserializeUser(async function(id, done) {
    try {
      console.log('Десериализация пользователя, ID:', id); // Для отладки
      const pool = await getConnection();
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM Users WHERE Id = @id');
      
      const user = result.recordset[0];
      
      if (user) {
        console.log('Найден пользователь:', user); // Для отладки
        done(null, user);  // Передаем объект пользователя
      } else {
        done(null, false); // Убедитесь, что не передаете ошибку, если пользователь не найден
      }
    } catch (err) {
      console.error('Ошибка при десериализации пользователя:', err);
      done(err);
    }
  });
};
