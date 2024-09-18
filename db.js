const sql = require('mssql');

const config = {
    user: 'OnlyFans',       // Имя пользователя SQL Server
    password: 'rjkfwrbq',   // Пароль SQL Server
    server: 'COMP1',        // Имя сервера SQL
    database: 'Basefun',    // Имя базы данных
    options: {
        encrypt: false, // Используйте true, если требуется шифрование
        trustServerCertificate: true // Установите true, если не используете SSL
    }
};

async function getConnection() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to MSSQL');
        return pool;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}

module.exports = { getConnection };
