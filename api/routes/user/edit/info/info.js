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
        return res.end(fs.readFileSync(__dirname+'/fg_info.json'));
    }

    return fs.readFile(__dirname+'/info.html', function (err, data) {
        if (!err) {
            return res.end(data);
        }

        return res.status(404).end('404 Not found.');
    });
});

router.put('/', JWTAutn.middle(), function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_info.json'));
    const body = req.body;

    const input = {user_id: body.user_id, keys: body.keys, values: body.values};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('update', function (_attach_) {
        const modify_statement = function (_input_) {
            var statement = {
                update: "UPDATE users",
                set: " SET",
                where: " WHERE u_id="+_input_.user_id
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
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.affectedRows != 0) {
                return emitter.emit('response', {
                    status: 1,
                    descript: 'แก้ไขข้อมูลสำเร็จแล้ว',
                    data: input
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

    emitter.emit('update', {});
});

module.exports = router;