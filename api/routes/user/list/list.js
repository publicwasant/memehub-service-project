const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');

const JWTAutn = require('./../../../../jwt_token');
const database = require('./../../../../database');
const logger = require('./../../../../tunnel/logger');

const router = express.Router();

router.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    const find = url.parse(req.url, true).query;

    if (find.page == 'example') {
        return res.end(fs.readFileSync(__dirname+'/fg_list.json'));
    }

    return fs.readFile(__dirname+'/list.html', function (err, data) {
        if (!err) {
            return res.end(data);
        }

        return res.status(404).end('404 Not found.');
    });
});

router.post('/', JWTAutn.middle(), function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_list.json'));
    const body = req.body;

    const input = {users_id: body.users_id};
    const output = fg.output;
    const emitter = new events.EventEmitter();

    emitter.on('select', function (_attach_) {
        const values = [input.users_id];
        const sql = "SELECT u_id as id, u_username as username, u_fullname as full_name, u_birthday as birthday,"
                    +" profiles.s_bio as bio, profiles.s_profile_picture_id as picture"
                    +" FROM users JOIN profiles ON profiles.s_id = users.u_profile_id"
                    +" WHERE users.u_id IN ?";

        database.query(sql, [values], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            } else if (result.length != 0) {
                const raw_format = function (_data_) {
                    for (var i=0; i < _data_.length; i++) {
                        if (_data_[i].picture != null) {
                            _data_[i].picture = {
                                raw: config.server.host+'/picture?id='+_data_[i].picture,
                                show: config.server.host+'/picture?idx='+_data_[i].picture
                            }
                        }
                    }

                    return {found: _data_.length, list: _data_};
                }

                return emitter.emit('response', {
                    status: 1,
                    descript: 'พบผู้ใช้แล้ว '+result.length+' ราย',
                    data: raw_format(result)
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่พบผู้ใช้!'
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

    emitter.emit('select', {});
});

module.exports = router;