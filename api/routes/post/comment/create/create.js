
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
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_create.json'));
    const body = req.body;

    const input = {user_id: body.user_id, post_id: body.post_id, comment: body.comment};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('insert', function (_attach_) {
        const sql = "INSERT INTO comments (c_user_id, c_post_id, c_text, c_picture_id) VALUES ?";
        const values = [[input.user_id, input.post_id, input.comment.text, input.comment.picture_id]];

        database.query(sql, [values], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            const final_picture = (input.comment.picture_id == null) ? null : {
                raw: config.server.host + '/picture?id=' + input.comment.picture_id,
                show: config.server.host + '/picture?idx=' + input.comment.picture_id
            };

            return emitter.emit('response', {
                status: 1,
                descript: 'เพิ่มการแสดงความคิดเห็นสำเร็จแล้ว!',
                data: {
                    id: result.insertId,
                    comment: {
                        text: input.comment.text,
                        picture: final_picture
                    }
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

    return emitter.emit('insert', {});
});

module.exports = router;