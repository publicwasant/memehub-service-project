const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');

const JWTToken = require('./../../../../../jwt_token');
const database = require('./../../../../../database');

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

router.post('/', JWTToken.middle(), function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_delete.json'));
    const body = req.body;

    const input = {user_id_u: body.user_id_u, user_id_v: body.user_id_v};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('unfollow', function (_attach_) {
        const sql = "DELETE FROM follows WHERE f_follower_id=? AND f_target_id=?";

        database.query(sql, [input.user_id_u, input.user_id_v], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            return emitter.emit('response', {
                status: 1,
                descript: 'ยกเลิกการติดตามแล้ว',
                data: input
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

    return emitter.emit('unfollow', {});
});

module.exports = router;