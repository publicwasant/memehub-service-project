const express = require('express');
const fs = require('fs');
const events = require('events');

const JWTToken = require('./../jwt_token');
const logger = require('./logger');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});

    return fs.readFile(__dirname+'/monitor.html', function (err, data) {
        if (!err) {
            return res.end(data);    
        }

        return res.status(404).end('404 Not found.');
    });
});

/* url: http://m-h.comsciproject.com/eyJ1cmwiOiJ0dW5uZWwifQ
 * sub: tunnel
 *
 * sub: logs
 * secret_key: pieceOfEden
 * 
 * usage_key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2dzIn0.Pr4s4ZvZ1jlBKrwNbpDSoSaDAIBXjGxDhB9m0rtCufY
 * 
 */

router.post('/', function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_tunnel.json'));
    const body = req.body;

    const input = {usage_key: body.usage_key};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('decode', function (_attach_) {
        const key = JWTToken.decode(input.usage_key);

        if (key.sub == 'logs') {
            return emitter.emit('response', {
                status: 1,
                descript: 'logs.json',
                data: logger.load()
            });
        } else {
            return emitter.emit('response', {
                status: 0,
                descript: 'Not found service.'
            });
        }
    });

    emitter.on('response', function (_attach_) {
        output.status = _attach_.status;
        output.descript = _attach_.descript;
        output.error = _attach_.err;
        output.data = _attach_.data;

        return res.status(200).json(output);
    });

    return emitter.emit('decode', {});
});

module.exports = router;