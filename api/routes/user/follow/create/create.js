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
        return res.end(fs.readFileSync(__dirname+'/fg_create.json'));
    }

    fs.readFile(__dirname+'/create.html', function (err, data) {
        if (!err) {
            return res.end(data);
        } 
        
        return res.status(404).end('404 Not found.');
    });
});

router.post('/', JWTToken.middle(), function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_create.json'));
    const body = req.body;

    const input = {user_id_u: body.user_id_u, user_id_v: body.user_id_v};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('modify_token', function (_attach_) {
        const sql = "SELECT u_iat FROM users WHERE u_id=?";
        
        database.query(sql, [input.user_id_u], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!',
                    err: err
                });
            }

            if (result.length != 0) {
                const iat = result[0].u_iat;
                const token = JWTToken.token(input.user_id_u, iat);

                return emitter.emit('related', {token: token});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!'
                });
            }
        });
    });
    
    emitter.on('related', function (_attach_) {
        const token = _attach_.token;

        const options = {
            headers: {
                'content-type' : 'application/json',
                'authorization': token
            },
            url: config.server.host+'/user/follow/related',
            body: JSON.stringify(input)
        }

        request.post(options, function(error, response, body) {
            const result = JSON.parse(body);
            
            if (result.status != 1) {
                return emitter.emit('insert', {});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'มีการติดตามอยู่แล้ว'
                });
            }
        });
    });

    emitter.on('insert', function (_attach_) {
        const sql = "INSERT INTO follows (f_follower_id, f_target_id) VALUES ?";
        const values = [[input.user_id_u, input.user_id_v]];
        
        database.query(sql, [values], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'ไม่สามารถเพิ่มการติดตาม!',
                    err: err
                });
            }

            return emitter.emit('response', {
                status: 1, 
                descript: 'เพิ่มการติดตามแล้ว',
                data: {
                    follow_id: result.insertId
                }
            });
        });
    });

    emitter.on('response', function (_attach_) {
        output.status = _attach_.status;
        output.descript = _attach_.descript;
        output.error = _attach_.err;
        output.data = _attach_.data;

        return res.status(200).json(output);
    });

    return emitter.emit('modify_token', {});
});

module.exports = router;