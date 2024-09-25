const sql = require('mssql');
const config = require('../db'); // Убедитесь, что путь к файлу конфигурации правильный

const getUserByUsername = async (username) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');
    return result.recordset[0];
  } catch (err) {
    console.error('Error fetching user:', err);
    throw err;
  }
};

const getUserById = async (userId) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('Id', sql.Int, userId)
      .query('SELECT Id, profileName, UserName, email, Description FROM Users WHERE Id = @Id');

    if (result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      throw new Error('Пользователь не найден');
    }
  } catch (err) {
    console.error('Ошибка при получении пользователя:', err);
    throw err;
  }
};

const createUser = async (username, hashedPassword, isPopular = false) => {
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('PasswordHash', sql.NVarChar, hashedPassword) // Исправлено на PasswordHash
      .input('isPopular', sql.Bit, isPopular) // Передаем isPopular
      .query('INSERT INTO Users (username, PasswordHash, isPopular) VALUES (@username, @PasswordHash, @isPopular)');
  } catch (err) {
    console.error('Error creating user:', err);
    throw err;
  }
};

module.exports = { getUserByUsername, createUser, getUserById }; // Экспортируем getUserById
