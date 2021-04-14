const http = require('http');
const fs = require('fs');

const app = require('./app');
const config = JSON.parse(fs.readFileSync('./config.json'));

http.createServer(app).listen(process.env.port || config.server.port);

