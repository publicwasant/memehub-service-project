
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

    return fs.readFile(__dirname+'/create.html', function (err, data) {
        if (!err) {
            return res.end(data);    
        }

        return res.status(404).end('404 Not found.');
    });
});

router.post('/', JWTToken.middle(), function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_create.json'));
    const body = req.body;

    const input = {user_id: body.user_id, post_id: body.post_id};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('check', function (_attach_) {
        const sql = "SELECT * FROM reaction WHERE r_user_id=? AND r_post_id=?";
        
        database.query(sql, [input.user_id, input.post_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.length == 0) {
                return emitter.emit('insert', {});
            } else {
                return emitter.emit('response', {
                    status: 1,
                    descript: 'เพิ่มการถูกใจโพสต์แล้ว',
                    data: {
                        id: result[0].r_id,
                        user_id: input.user_id,
                        post_id: input.post_id
                    }
                });
            }
        });
    });

    emitter.on('insert', function (_attach_) {
        const sql = "INSERT INTO reaction (r_user_id, r_post_id) VALUES (?, ?)";

        database.query(sql, [input.user_id, input.post_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            return emitter.emit('response', {
                status: 1,
                descript: 'เพิ่มการถูกใจโพสต์แล้ว',
                data: {
                    id: result.insertId,
                    user_id: input.user_id,
                    post_id: input.post_id
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

    return emitter.emit('check', {});
});

module.exports = router;