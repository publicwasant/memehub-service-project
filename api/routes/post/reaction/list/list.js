
const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');
const request = require('request');

const JWTToken = require('./../../../../../jwt_token');
const database = require('./../../../../../database');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_list.json'));
    }

    return fs.readFile(__dirname+'/list.html', function (err, data) {
        if (!err) {
            return res.end(data);    
        }

        return res.status(404).end('404 Not found.');
    });
});

router.post('/', function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_list.json'));
    const body = req.body;

    const input = {reaction_id: body.reaction_id};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('get', function (_attach_) {
        const reaction = []

        emitter.on('request', function (_attach_) {
            const ind = _attach_.ind;

            if (ind == input.reaction_id.length) {
                return emitter.emit('finish', {});
            }

            const options = {
                headers: {'content-type': 'application/json'},
                url: config.server.host + '/post/reaction?id=' + input.reaction_id[ind]
            }

            request.get(options, function(err, response, body) {
                if (err) {
                    return emitter.emit('request', {ind: ind+1});
                }
    
                const result = JSON.parse(body);
    
                if (result.status == 1) {
                    reaction.push(result.data);
                    
                    return emitter.emit('request', {ind: ind+1});
                } else {
                    return emitter.emit('request', {ind: ind+1});
                }
            });
        });

        emitter.on('finish', function (_attach_) {
            if (reaction.length != 0) {
                return emitter.emit('response', {
                    status: 1,
                    descript: 'พบลิสต์การถูกใจของผู้ใช้แล้ว',
                    data: {
                        found: reaction.length,
                        list: reaction
                    }
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่พบลิสต์การถูกใจของผู้ใช้!',
                    data: {
                        found: 0,
                        list: []
                    }
                });
            }
        });

        return emitter.emit('request', {ind: 0});
    });

    emitter.on('response', function (_attach_) {
        output.status = _attach_.status;
        output.descript = _attach_.descript;
        output.error = _attach_.err;
        output.data = _attach_.data;

        return res.status(200).json(output);
    });

    return emitter.emit('get', {});
});

module.exports = router;