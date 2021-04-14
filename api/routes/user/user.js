const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');

const JWTToken = require('./../../../jwt_token');
const database = require('./../../../database');

const router = express.Router();

const modify_statement = function (_input_) {
    if (_input_.id) {
        return "SELECT u_id as id, u_username as username, u_fullname as full_name, u_birthday as birthday,"
                +" profiles.s_bio as bio, profiles.s_profile_picture_id as picture"
                +" FROM users JOIN profiles ON profiles.s_id = users.u_profile_id"
                    +" WHERE users.u_id="+_input_.id;
    } else if (_input_.key) {
        return "SELECT u_id as id, u_username as username, u_fullname as full_name, u_birthday as birthday,"
                +" profiles.s_bio as bio, profiles.s_profile_picture_id as picture"
                +" FROM users JOIN profiles ON profiles.s_id = users.u_profile_id"
                    +" WHERE users.u_username LIKE '%"+_input_.key+"%'"
                    +" OR users.u_fullname LIKE '%"+_input_.key+"%'";
    } else {
        return null;
    }
}

const raw_format = function (_data_) {
    const config = JSON.parse(fs.readFileSync('config.json'));

    for (var i=0; i < _data_.length; i++) {
        if (_data_[i].picture != null) {
            _data_[i].picture = {
                id: _data_[i].picture,
                raw: config.server.host+'/picture?id='+_data_[i].picture,
                show: config.server.host+'/picture?idx='+_data_[i].picture
            }
        }
    }

    return {found: _data_.length, list: _data_};
}

router.get('/', JWTToken.middle(), function (req, res) {
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_user.json'));
    
    const input = url.parse(req.url, true).query;
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('select', function (_attach_) {
        const sql = modify_statement(input);

        database.query(sql, function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดผลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.length != 0) {
                return emitter.emit('response', {
                    status: 1,
                    descript: 'พบผู้ใช้แล้ว '+result.length+' ราย',
                    data: raw_format(result)
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่พบผู้ใช้'
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