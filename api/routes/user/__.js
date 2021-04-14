const express = require('express');
const fs = require('fs');
const url = require('url');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_user.json'));
    }

    return fs.readFile(__dirname+'/user.html', function (err, data) {
        if (!err) {
            return res.end(data);    
        }

        return res.status(404).end('404 Not found.');
    });
});


module.exports = router;