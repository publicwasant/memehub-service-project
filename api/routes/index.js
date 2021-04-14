const express = require('express');
const fs = require('fs');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});

    fs.readFile(__dirname+'/index.html', 'utf8', function (err, data) {
        if (!err) {
            return res.end(data);
        }
        
        return res.status(404).end('404 Not found.');
    });
});

module.exports = router;