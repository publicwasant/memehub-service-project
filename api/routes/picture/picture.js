const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');

const JWTToken = require('./../../../jwt_token');
const database = require('./../../../database');

const router = express.Router();

router.get('/', function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_picture.json'));
    
    const input = url.parse(req.url, true).query;
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('selector', function (_attach_) {
        if (input.id) {
            return emitter.emit('id_search', {picture_id: input.id});
        } else if (input.idx) {
            return emitter.emit('idx_search', {picture_id: input.idx});
        } else if (input.name) {
            return emitter.emit('write', {file_name: input.name});
        } else {
            return emitter.emit('write', {file_name: null});
        }
    });

    emitter.on('id_search', function (_attach_) {
        const picture_id = _attach_.picture_id;

        const sql = "SELECT * FROM pictures WHERE p_id=?";
        database.query(sql, [picture_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.length != 0) {
                return emitter.emit('response', {
                    status: 1,
                    descript: 'พบข้อมูลแล้ว',
                    data: result[0]
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่พบข้อมูล!'
                });
            }
        });
    });

    emitter.on('idx_search', function (_attach_) {
        const picture_id = _attach_.picture_id;

        const sql = "SELECT * FROM pictures WHERE p_id=?";
        database.query(sql, [picture_id], function (err, result) {
            if (err) {
                return emitter.emit('write', {file_name: null});
            }

            if (result.length != 0) {
                const usage_path = result[0].p_pathname;
                const name = url.parse(usage_path, true).query.name;

                return emitter.emit('write', {file_name: name});
            } else {
                return emitter.emit('write', {file_name: null});
            }
        });
    });

    emitter.on('write', function (_attach_) {
        const file_name = _attach_.file_name;

        fs.readFile('./' + config.media.upload_path + file_name, function (err, data) {
            if (err) {
                return res.status(404).end(err.message);
            }

            return res.status(200).end(data);
        });
    });

    emitter.on('response', function (_attach_) {
        output.status = _attach_.status;
        output.descript = _attach_.descript;
        output.error = _attach_.err;
        output.data = _attach_.data;

        return res.status(200).json(output);
    });

    return emitter.emit('selector', {});
});

module.exports = router;