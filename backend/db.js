const sql = require('mssql');

const config = {
       user: 'Esnyca_app_user',
       password: 'esnycaappuser!',
       server: 'localhost',
       database: 'Esnyca_app',
       options:{
         encrypt: false,
         trustServerCertificate: true
        }
 };

sql.connect(config)
    .then(() => console.log('Connected to SQL Server: Esnyca_app'))
       .catch(err => console.log('DB Connection Error:',err));

module.exports = sql;