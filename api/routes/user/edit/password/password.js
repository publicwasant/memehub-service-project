const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');

const JWTAutn = require('./../../../../../jwt_token');
const database = require('./../../../../../database');
const passwordHash = require('password-hash');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_password.json'));
    }

    return fs.readFile(__dirname+'/password.html', function (err, data) {
        if (!err) {
            return res.end(data);
        }
        
        return res.status(404).end('404 Not found.');
    });
});

router.put('/', JWTAutn.middle(), function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_password.json'));
    const body = req.body;
    
    const input = {
        user_id: body.user_id, 
        old_password: body.old_password, 
        new_password: passwordHash.generate(body.new_password)
    };

    const output = fg.output;
    const emitter = new events.EventEmitter();

    emitter.on('verify', function (_attach_) {
        const sql = "SELECT u_password FROM users WHERE u_id=?";
        
        database.query(sql, [input.user_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!', 
                    err: err
                });
            } 
            
            if (result.length != 0) {
                const recent_password = result[0].u_password;

                if (passwordHash.verify(input.old_password, recent_password)) {
                    return emitter.emit('change', {});
                } else {
                    return emitter.emit('response', {
                        status: 0, 
                        descript: 'รหัสผ่านไม่ถูก!',
                    });
                }
            } else {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'ไม่พบผู้ใช้!',
                });
            }
        });
    });

    emitter.on('change', function (_attach_) {
        let sql = "UPDATE users SET u_password=? WHERE u_id=?";

        database.query(sql, [input.new_password, input.user_id], function (err, result) {
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
                    descript: 'แก้ไขรหัสผ่านสำเร็จแล้ว', 
                    err: null
                });
            } else {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'แก้ไขรหัสผ่านไม่สำเร็จ!',
                });
            }
        });
    });

    emitter.on('response', function (_attach_) {
        output.status = _attach_.status;
        output.descript = _attach_.descript;
        output.error = _attach_.err;

        return res.status(200).json(output);
    });

    emitter.emit('verify', {});
});

module.exports = router;