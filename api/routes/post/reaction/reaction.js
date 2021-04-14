
const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');
const request = require('request');

const JWTToken = require('./../../../../jwt_token');
const database = require('./../../../../database');

const router = express.Router();

router.get('/', function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_reaction.json'));
    
    const input = url.parse(req.url, true).query;
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('start', function (_attach_) {
        if (input.id) {
            return emitter.emit('id_search', {});
        }else if (input.post_id) {
            return emitter.emit('post_id_search', {});
        } else {
            return res.status(404).end('404 Not found.');
        }
    });

    emitter.on('id_search', function (_attach_) {
        const sql = "SELECT * FROM reaction WHERE r_id=?";

        database.query(sql, [input.id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.length != 0) {
                const data = result[0];

                return emitter.emit('modify_token', {reaction: {
                    id: data.r_id,
                    user: {
                        id: data.r_user_id
                    },
                    post: {
                        id: data.r_post_id
                    }
                }});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่พบการถูกใจ!'
                });
            }
        });
    });

    emitter.on('modify_token', function (_attach_) {
        const reaction = _attach_.reaction;
        const sql = "SELECT u_iat FROM users WHERE u_id=?";
        
        database.query(sql, [reaction.user.id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!',
                    err: err
                });
            }

            if (result.length != 0) {
                const iat = result[0].u_iat;
                const token = JWTToken.token(reaction.user.id, iat);

                return emitter.emit('prep_user', {reaction: reaction, token: token});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!'
                });
            }
        });
    });

    emitter.on('prep_user', function (_attach_) {
        const token = _attach_.token;
        const reaction = _attach_.reaction;

        const options = {
            headers: {'content-type': 'application/json', 'authorization': token},
            url: config.server.host + '/user?id=' + reaction.user.id
        }

        request.get(options, function(err, response, body) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            const result = JSON.parse(body);

            if (result.status == 1) {
                reaction.user = result.data.list[0];

                return emitter.emit('response', {
                    status: 1,
                    descript: 'พบการถูกใจแล้ว',
                    data: reaction
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!'
                });
            }
        });
    });

    emitter.on('post_id_search', function (_attach_) {
        const sql = "SELECT r_id FROM reaction WHERE r_post_id=?";

        database.query(sql, [input.post_id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.length != 0) {
                const formats = function (_data_) {
                    const data = _data_.result;
                    const tmps = []
                    
                    for (const i in data) {
                        tmps.push(data[i].r_id);
                    }

                    return tmps;
                };

                const options = {
                    headers: {'content-type': 'application/json'},
                    url: config.server.host + '/post/reaction/list',
                    body: JSON.stringify({reaction_id: formats({result: result})})
                }
        
                request.post(options, function(err, response, body) {
                    if (err) {
                        return emitter.emit('response', {
                            status: 0,
                            descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                            err: err
                        });
                    }
        
                    const result = JSON.parse(body);
        
                    if (result.status == 1) {
                        return emitter.emit('response', {
                            status: 1,
                            descript: 'พบการถูกใจของโพสต์แล้ว',
                            data: result.data
                        });
                    } else {
                        return emitter.emit('response', {
                            status: 0,
                            descript: 'เกิดข้อผิดพลาดบางอย่าง!'
                        });
                    }
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่พบข้อมูล!'
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

    return emitter.emit('start', {});
});

module.exports = router;