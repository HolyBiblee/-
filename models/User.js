// models/User.js
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
async function getUserById(userId) {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('Id', sql.Int, userId)
      .query('SELECT Id, UserName, email, Description FROM Users WHERE Id = @Id');
    
    if (result.recordset.length > 0) {
      return result.recordset[0];
    } else {
      throw new Error('Пользователь не найден');
    }
  } catch (err) {
    console.error('Ошибка при получении пользователя:', err);
    throw err;
  }
}
const createUser = async (username, hashedPassword) => {
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .query('INSERT INTO Users (username, password) VALUES (@username, @password)');
  } catch (err) {
    console.error('Error creating user:', err);
    throw err;
  }
};

module.exports = { getUserByUsername, createUser };
