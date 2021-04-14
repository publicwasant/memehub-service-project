
const express = require('express');
const fs = require('fs');
const url = require('url');

const router = express.Router();

router.get('/', function (req, res) {
    // res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    return res.end(fs.readFileSync(__dirname + '/' + find.module));
});

module.exports = router;