// middleware/ownershipMiddleware.js
const { getConnection } = require('../db');
const sql = require('mssql');

const verifyPostOwnership = async (req, res, next) => {
  const postId = req.params.id;
  const userId = req.user.Id;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, postId)
      .query('SELECT userId FROM Posts WHERE id = @id');

    const post = result.recordset[0];

    if (!post) {
      return res.status(404).send('Пост не найден');
    }

    if (post.userId !== userId) {
      return res.status(403).send('У вас нет прав для выполнения этого действия.');
    }

    next();
  } catch (err) {
    console.error('Ошибка при проверке владения постом:', err);
    res.status(500).send('Ошибка сервера');
  }
};

module.exports = { verifyPostOwnership };
