const sql = require('mssql');
require('dotenv').config();

// .env dosyasındaki değişkenleri kullanarak bir konfigürasyon nesnesi oluşturuyoruz.
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    // Windows Authentication kullanılıyorsa trustedConnection true olmalı.
    // DB_USER boş ise Windows Auth varsayıyoruz. Bu bizim için en önemli satır.
    trustedConnection: !process.env.DB_USER, 
    encrypt: true, 
    trustServerCertificate: true // localhost geliştirme ortamı için sertifika hatalarını önler
  },
  port: parseInt(process.env.DB_PORT) // Portu sayıya çeviriyoruz
};

// Bağlantı havuzunu (connection pool) oluşturup bağlanmaya çalışıyoruz.
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('SQL Server\'a başarıyla bağlanıldı.');
    return pool;
  })
  .catch(err => console.error('Veritabanı bağlantı hatası: ', err));

// Bağlantı havuzunu ve sql nesnesini dışa aktarıyoruz.
// Bunları controller dosyalarımızda sorgu yapmak için kullanacağız.
module.exports = {
  sql, poolPromise
};