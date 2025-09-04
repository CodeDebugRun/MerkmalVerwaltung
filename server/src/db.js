const sql = require('mssql');
require('dotenv').config();

// Temel konfigürasyon nesnesini oluşturuyoruz.
const config = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: true,
    trustServerCertificate: true // localhost geliştirme ortamı için sertifika hatalarını önler
  }
};

// Şimdi kimlik doğrulama türünü .env dosyasına göre belirliyoruz.
if (process.env.DB_USER) {
  // Eğer DB_USER doluysa, SQL Server Authentication kullanılır.
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
  config.options.trustedConnection = false;
} else {
  // Eğer DB_USER boşsa, Windows Authentication kullanılır.
  config.options.trustedConnection = true;
}


// Bağlantı havuzunu (connection pool) oluşturup bağlanmaya çalışıyoruz.
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('SQL Server\'a başarıyla bağlanıldı.');
    return pool;
  })
  .catch(err => console.error('Veritabanı bağlantı hatası: ', err));


module.exports = {
  sql, poolPromise
};