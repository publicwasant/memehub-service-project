
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
        return res.end(fs.readFileSync(__dirname+'/fg_following.json'));
    }

    return fs.readFile(__dirname+'/following.html', function (err, data) {
        if (!err) {
            return res.end(data);    
        }

        return res.status(404).end('404 Not found.');
    });
});

router.post('/', JWTToken.middle(), function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_following.json'));
    const body = req.body;

    const input = {user_id: body.user_id};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('select', function (_attach_) {
        const sql = "SELECT f_follower_id FROM follows WHERE f_target_id=?";

        database.query(sql, [input.user_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.length != 0) {
                return emitter.emit('modify_token', {users_id: result});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่มีการติดตาม!'
                });
            }
        });
    });

    emitter.on('modify_token', function (_attach_) {
        const sql = "SELECT u_iat FROM users WHERE u_id=?";
        
        database.query(sql, [input.user_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!',
                    err: err
                });
            }

            if (result.length != 0) {
                const iat = result[0].u_iat;
                const token = JWTToken.token(input.user_id, iat);

                return emitter.emit('compress', {token: token, users_id: _attach_.users_id});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!'
                });
            }
        });
    });

    emitter.on('compress', function (_attach_) {
        const token = _attach_.token;
        const users_id = function (_raw_) {
            var _temp_ = [];

            for (var i = 0; i < _raw_.length; i++) {
                _temp_.push(_raw_[i].f_follower_id);
            }

            return _temp_;
        }

        const options = {
            headers: {
                'content-type' : 'application/json',
                'authorization': token
            },
            url: config.server.host+'/user/list',
            body: JSON.stringify({users_id: users_id(_attach_.users_id)})
        }

        request.post(options, function(err, response, body) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (response.statusCode != 401) {
                const result = JSON.parse(body);

                if (result.status == 1) {
                    return emitter.emit('response', {
                        status: 1,
                        descript: 'กำลังติดตาม',
                        data: result.data
                    });
                } else {
                    return emitter.emit('response', {
                        status: 0,
                        descript: result.descript,
                        err: result.error
                    }); 
                }
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: response.statusMessage
                });
            }
        });
    });

    emitter.on('response', function (_attach_) {
        output.status = _attach_.status;
        output.descript = _attach_.descript;
        output.error = _attach_.err;
        output.data = _attach_.data;

        return res.status(200).json(output);
    });

    return emitter.emit('select', {});
});

module.exports = router;