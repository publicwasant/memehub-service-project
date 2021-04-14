const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');
const passwordHash = require('password-hash');

const JWTToken = require('../../../../jwt_token');
const database = require('./../../../../database');
const logger = require('./../../../../tunnel/logger');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_upload.json'));
    }

    return fs.readFile(__dirname+'/upload.html', function (err, data) {
        if (!err) {
            return res.end(data);
        } 
        
        return res.status(404).end('404 Not found.');
    });
});

router.post('/', JWTToken.middle(), function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_upload.json'));
    const body = req.body;

    const input = {
        user_id: body.p_user_id, 
        date: body.p_date_upload, 
        data: {
            type: body.p_data.p_type,
            base64: body.p_data.p_base64
        }
    };

    const output = fg.output;
    const emitter = new events.EventEmitter();

    emitter.on('insert', function (_attach_) {
        const sql = "INSERT INTO pictures (p_user_id, p_date_upload, p_pathname) VALUES ?";
        const values = [[input.user_id, input.date, null]];

        database.query(sql, [values], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            return emitter.emit('prep_media', {picture_id: result.insertId, type: input.data.type});
        });
    });

    emitter.on('prep_media', function (_attach_) {
        const picture_id = _attach_.picture_id;
        const type = _attach_.type;
        const base64 = input.data.base64;

        const modify_name = function (_prop_) {
            const picture_id = _prop_.picture_id;
            const picture_type = _prop_.type;

            var _hash_ = passwordHash.generate('id='+picture_id).replace('sha1$', '');
            var _temp_ = '';

            for (var i = 0; i < _hash_.length; i++) {
                if (_hash_[i] != '$') {
                    _temp_ += _hash_[i];
                }
            }

            return _temp_ + '.' + picture_type;
        };

        const modify_data = function (_base64_) {
            var matches = _base64_.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/), response = {};
        
            response.type = matches[1];
            response.data = Buffer.from(matches[2], 'base64');
            return response;
        }

        const picture_name = modify_name({picture_id: picture_id, type: type});
        const options = {
            name: picture_name,
            pathname: '.' + config.media.upload_path + picture_name,
            data: modify_data(base64).data
        };

        return emitter.emit('write_file', {picture_id: picture_id, options: options});
    });

    emitter.on('write_file', function (_attach_) {
        const picture_id = _attach_.picture_id;
        const options = _attach_.options;


        fs.writeFile(options.pathname, options.data, function (err) {
            if (err) {
                database.query("DELETE FROM pictures WHERE p_id=?", [picture_id], function (err, result) {});  

                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการบันทึกไฟล์!',
                    err: err
                });
            }

            const usage_path = config.media.full_path + '/picture?name=' + options.name;
            
            return emitter.emit('update_path', {picture_id: picture_id, usage_path: usage_path});
        });
    });

    emitter.on('update_path', function (_attach_) {
        const picture_id = _attach_.picture_id;
        const usage_path = _attach_.usage_path;
        const sql = "UPDATE pictures SET p_pathname = ? WHERE p_id=?";

        database.query(sql, [usage_path, picture_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการบันทึกไฟล์!',
                    err: err
                });
            }

            return emitter.emit('response', {
                status: 1,
                descript: 'บันทึกไฟล์สำเร็จแล้ว',
                data: {
                    p_id: picture_id,
                    p_user_id: input.user_id,
                    p_date_upload: input.date,
                    p_pathname: usage_path
                }
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

    return emitter.emit('insert', {});
});

module.exports = router;