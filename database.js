const mysql = require('mysql');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json'));

module.exports = mysql.createPool(config.database);;
