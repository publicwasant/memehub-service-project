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
        return res.end(fs.readFileSync(__dirname+'/fg_register.json'));
    }

    return fs.readFile(__dirname+'/register.html', function (err, data) {
        if (!err) {
            return res.end(data);
        }

        return res.status(404).end('404 Not found.');
    });
});

router.post('/', function (req, res) {
    const emitter = new events.EventEmitter();
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_register.json'));
    const body = req.body;

    const input = {
        username: body.u_username,
        fullname: body.u_fullname,
        birthday: body.u_birthday,
        password: body.u_password,
        profile_id: null,
        iat: new Date().getTime()
    };

    const output = fg.output;

    emitter.on('insert_profile', function (_attach_) {
        const sql = "INSERT INTO profiles (s_profile_picture_id, s_bio) VALUES (NULL, NULL)";
        database.query(sql, function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            return emitter.emit('insert_user', {profile_id: result.insertId});
        });
    });

    emitter.on('insert_user', function (_attach_) {
        const profile_id = _attach_.profile_id;
        const password_encrypt = password_hash.generate(input.password);
        
        const sql = "INSERT INTO users (u_username, u_fullname, u_birthday, u_password, u_profile_id, u_iat) VALUES ?";
        const values = [[input.username, input.fullname, input.birthday, password_encrypt, profile_id, input.iat]];
        database.query(sql, [values], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ชื่อผู้ใช้ '+input.username+' ถูกใช้แล้ว!'
                });
            } else {
                return emitter.emit('response', {
                    status: 1,
                    descript: 'ลงชื่อเข้าใช้สำเร็จแล้ว',
                    data: {token: JWTToken.full_token(result.insertId, input.iat)}
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
    
    emitter.emit('insert_profile', {});
});

module.exports = router;