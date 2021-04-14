const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');

const JWTToken = require('../../../../jwt_token');
const database = require('./../../../../database');
const logger = require('./../../../../tunnel/logger');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_delete.json'));
    }

    fs.readFile(__dirname+'/delete.html', function (err, data) {
        if (!err) {
            return res.end(data);
        }
        
        return res.status(404).end('404 Not found.');
    });
});

router.post('/', JWTToken.middle(), function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_delete.json'));
    const body = req.body;

    const input = {picture_id: body.p_id};
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('path', function (_attach_) {
        const sql = "SELECT p_pathname FROM pictures WHERE p_id=?";
        
        database.query(sql, [input.picture_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.length != 0) {
                const usage_path = result[0].p_pathname;
                
                return emitter.emit('unlink', {usage_path: usage_path});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่พบข้อมูล!'
                });
            }
        });
    });

    emitter.on('unlink', function (_attach_) {
        const usage_path = _attach_.usage_path;
        const file_name = url.parse(usage_path, true).query.name;
        const del_path = '.' + config.media.upload_path + file_name

        fs.unlink(del_path, function (err) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการลบไฟล์!',
                    err: err
                });
            }

            return emitter.emit('delete', {});
        });
    });

    emitter.on('delete', function (_attach_) {
        const sql = "DELETE FROM pictures WHERE p_id=?";

        database.query(sql, [input.picture_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการลบไฟล์!',
                    err: err
                });
            }

            return emitter.emit('response', {
                status: 1,
                descript: 'ลบข้อมูลสำเร็จแล้ว'
            });
        });
    });

    emitter.on('', function (_attach_) {
    });

    emitter.on('response', function (_attach_) {
        output.status = _attach_.status;
        output.descript = _attach_.descript;
        output.error = _attach_.err;
        output.data = _attach_.data;

        return res.status(200).json(output);
    });

    return emitter.emit('path', {});
});

module.exports = router;