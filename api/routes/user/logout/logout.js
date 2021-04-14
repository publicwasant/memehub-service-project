
const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');

const JWTToken = require('./../../../../jwt_token');
const database = require('./../../../../database');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_logout.json'));
    }

    return fs.readFile(__dirname+'/logout.html', function (err, data) {
        if (!err) {
            return res.end(data);    
        }

        return res.status(404).end('404 Not found.');
    });
});

router.put('/', JWTToken.middle(), function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_logout.json'));
    const body = req.body;

    const input = {user_id: body.user_id};
    const output = fg.output;
    const emitter = new events.EventEmitter();

    emitter.on('update', function (_attach_) {
        const sql = "UPDATE users SET u_iat=? WHERE u_id=?";
        database.query(sql, [null, input.user_id], function (err, result) {
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
                    descript: 'ออกจากระบบสำเร็จ'
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ออกจากระบบไม่สำเร็จ!'
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

    emitter.emit('update', {});
});

module.exports = router;