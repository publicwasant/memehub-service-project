const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');

const JWTAutn = require('./../../../../../jwt_token');
const database = require('./../../../../../database');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_picture.json'));
    }

    return fs.readFile(__dirname+'/picture.html', function (err, data) {
        if (!err) {
            return res.end(data);
        }

        return res.status(404).end('404 Not found.');
    });
});

router.put('/', JWTAutn.middle(), function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_picture.json'));
    const body = req.body;
    
    const input = {user_id: body.user_id, picture_id: body.picture_id};
    const output = fg.output;
    const emitter = new events.EventEmitter();

    emitter.on('change', function (_attach_) {
        const sql = "UPDATE profiles SET s_profile_picture_id=?"
                    +" WHERE s_id=(SELECT u_profile_id FROM users WHERE u_id=?)";

        database.query(sql, [input.picture_id, input.user_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.affectedRows != 0) {
                return emitter.emit('response', {
                    status: 1, 
                    descript: 'แก้ไขข้อมูลสำเร็จแล้ว'
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'แก้ไขข้อมูลไม่สำเร็จ!'
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

    emitter.emit('change', {});
});

module.exports = router;