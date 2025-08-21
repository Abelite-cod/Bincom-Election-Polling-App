const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // default for XAMPP
  password: '',       // leave empty unless you set one
  database: 'bincom_test'
});

db.connect((err) => {
  if (err) throw err;
  console.log('✅ MySQL Connected...');
});

module.exports = db;
