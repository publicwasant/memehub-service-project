
const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');
const request = require('request');

const JWTToken = require('./../../../../jwt_token');
const database = require('./../../../../database');
const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_edit.json'));
    }

    return fs.readFile(__dirname+'/edit.html', function (err, data) {
        if (!err) {
            return res.end(data);    
        }

        return res.status(404).end('404 Not found.');
    });
});

router.put('/', JWTToken.middle(), function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_edit.json'));
    const body = req.body;

    const input = {post_id: body.post_id, keys: body.keys, values: body.values};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('edit', function (_attach_) {
        const modify_statement = function (_input_) {
            var statement = {
                update: "UPDATE posts",
                set: " SET",
                where: " WHERE pt_id="+_input_.post_id
            };

            for (var i=0; i < _input_.keys.length; i++) {
                statement.set += " " + _input_.keys[i] + "='" + _input_.values[i] + "'";

                if (i != _input_.keys.length-1) {
                    statement.set += ",";
                }
            }

            return statement.update + statement.set + statement.where;
        };

        database.query(modify_statement(input), function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดผลาดบางอย่าง!',
                    err: err
                });
            }

            const edited = result.affectedRows;

            if (edited != 0) {
                return emitter.emit('response', {
                    status: 1,
                    descript: 'แก้ไขโพสต์สำเสร็จแล้ว',
                    data: {edited: edited}
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'แก้ไขโพสต์ไม่สำเสร็จ!'
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

    return emitter.emit('edit', {});
});

module.exports = router;