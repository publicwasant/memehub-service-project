const express = require('express');
const fs = require('fs');
const url = require('url');
const request = require('request');
const events = require('events');

const JWTAutn = require('../../../../jwt_token');
const database = require('./../../../../database');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_delete.json'));
    }

    return fs.readFile(__dirname+'/delete.html', function (err, data) {
        if (!err) {
            return res.end(data);
        }
        
        return res.status(404).end('404 Not found.');
    });
});

router.post('/', JWTAutn.middle(), function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_delete.json'));
    const body = req.body;

    const input = {u_username: body.u_username, u_password: body.u_password};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('login', function (_attach_) {
        const options = {
            headers: {'content-type' : 'application/json'},
            url: config.server.host+'/user/login',
            body: JSON.stringify(input)
        }
    
        request.post(options, function(err, response, body){
            if (err) {
                return emitter.emit('response', {
                    status: 0, 
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            const result = JSON.parse(body);

            if (result.status == 1) {
                return emitter.emit('delete', {result: result});
            } else {
                return res.status(200).json(result);
            }

        });
    });

    emitter.on('delete', function (_attach_) {
        const token = _attach_.result.data.token;
        const payload = JWTAutn.decode(token);

        const sql = "DELETE FROM users WHERE u_id=?";

        database.query(sql, [payload.sub], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ลบข้อมูลผู้ใช้ไม่สำเร็จ!',
                    err: err
                });
            }

            return emitter.emit('response', {
                status: 1,
                descript: 'ลบข้อมูลผู้ใช้สำเร็จแล้ว',
                data: {deleted: result.affectedRows}
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

    emitter.emit('login', {});
});

module.exports = router;