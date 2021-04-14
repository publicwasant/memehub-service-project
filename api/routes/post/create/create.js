const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');
const request = require('request');
const date_format = require('dateformat');

const JWTToken = require('./../../../../jwt_token');
const database = require('./../../../../database');
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

    console.log();

    const input = {
        user_id: body.user_id, 
        caption: body.caption, 
        picture_id: body.picture_id,
        date: date_format(new Date(), 'yyyy-mm-dd'),
        time: date_format(new Date(), 'HH:MM:ss')
    };

    const output = fg.output;
    const emitter = new events.EventEmitter();

    emitter.on('insert', function (_attach_) {
        const sql = "INSERT INTO posts (pt_user_id, pt_text_caption, pt_picture_id, pt_date, pt_time) VALUES ?";
        const values = [[input.user_id, input.caption, input.picture_id, input.date, input.time]];

        database.query(sql, [values], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            return emitter.emit('final_post', {post_id: result.insertId});
        });
    });

    emitter.on('final_post', function (_attach_) {
        const post_id = _attach_.post_id;

        const options = {
            headers: {'content-type': 'application/json'},
            url: config.server.host + '/post?id=' + post_id
        };

        request.get(options, function(err, response, body) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            const result = JSON.parse(body);
            
            if (result.status == 1) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เพิ่มโพสต์สำเร็จแล้ว',
                    data: result.data
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เพิ่มโพสต์ไม่สำเร็จ!',
                    err: err
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

    return emitter.emit('insert', {});
});

module.exports = router;