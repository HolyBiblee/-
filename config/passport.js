// config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { getUserByUsername } = require('../models/User');
const config = require('../db'); // Убедитесь, что путь к файлу конфигурации правильный
const sql = require('mssql');

module.exports = (passport) => {
  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const user = await getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Неверное имя пользователя.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Неверный пароль.' });
        }
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM Users WHERE id = @id');
      done(null, result.recordset[0]);
    } catch (err) {
      done(err);
    }
  });
};
