const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');
const password_hash = require('password-hash');

const JWTToken = require('./../../../../jwt_token');
const database = require('./../../../../database');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_login.json'));
    }

    return fs.readFile(__dirname+'/login.html', function (err, data) {
        if (!err) {
            return res.end(data);
        } 
        
        return res.status(404).end('404 Not found.');
    });
});

router.post('/', function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_login.json'));
    const body = req.body;

    const input = {username: body.u_username, password: body.u_password};
    const output = fg.output;
    const emitter = new events.EventEmitter();

    emitter.on('verifier', function (_attach_) {
        const sql = "SELECT u_id, u_username, u_password FROM users WHERE u_username=?";

        database.query(sql, [input.username], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!', 
                    err: err
                });
            } 
            
            if (result.length != 0) {
                const user = result[0];

                if (password_hash.verify(input.password, user.u_password)) {
                    return emitter.emit('password_correct', {user: user});
                } else {
                    return emitter.emit('response', {
                        status: 0, 
                        descript: 'รหัสผ่านไม่ถูก!'
                    });
                } 
            } else {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'ไม่พบชื่อผู้ใช้!'
                });
            }
        });
    });

    emitter.on('password_correct', function (_attach_) {
        const user = _attach_.user;
        const new_iat = new Date().getTime();

        const sql = "UPDATE users SET u_iat=? WHERE u_id=?";
        database.query(sql, [new_iat, user.u_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!', 
                    err: err
                });
            }
            
            if (result.affectedRows == 1) {
                return emitter.emit('response', {
                    status: 1, 
                    descript: 'เข้าสู่ระบบสำเสร็จ',
                    data: {token: JWTToken.full_token(user.u_id, user.u_username, new_iat)}
                });
            } else {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'เข้าสู่ระบบไม่สำเสร็จ!'
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

    emitter.emit('verifier', {});
});

module.exports = router;