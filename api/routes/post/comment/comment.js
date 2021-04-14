
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
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_comment.json'));
    
    const input = url.parse(req.url, true).query;
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('start', function (_attach_) {
        if (input.id) {
            return emitter.emit('id_search', {});
        } else if (input.post_id) {
            return emitter.emit('post_id_search', {});
        } else {
            return res.status(404).end('404 Not found.');
        }
    });

    emitter.on('id_search', function (_attach_) {
        const sql = "SELECT * FROM comments WHERE c_id=?";

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
                const comb_pic = (data.c_picture_id == null) ? null : {
                    id: data.c_picture_id,
                    raw: config.server.host + '/picture?id=' + data.c_picture_id,
                    show: config.server.host + '/picture?idx=' + data.c_picture_id
                };

                return emitter.emit('modify_token', {
                    comment: {
                        id: data.c_id,
                        user: {
                            id: data.c_user_id
                        },
                        material: {
                            text: data.c_text,
                            picture: comb_pic
                        },
                        post: {
                            id: data.c_post_id
                        }
                    }
                });
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'ไม่พบการแสดงความคิดเห็น!'
                });
            }
        });
    });

    emitter.on('modify_token', function (_attach_) {
        const comment = _attach_.comment;
        const sql = "SELECT u_iat FROM users WHERE u_id=?";
        
        database.query(sql, [comment.user.id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!',
                    err: err
                });
            }

            if (result.length != 0) {
                const iat = result[0].u_iat;
                const token = JWTToken.token(comment.user.id, iat);

                return emitter.emit('prep_user', {token: token, comment: comment});
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
        const comment = _attach_.comment;

        const options = {
            headers: {'content-type': 'application/json', 'authorization': token},
            url: config.server.host + '/user?id=' + comment.user.id
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
                comment.user = result.data.list[0];

                return emitter.emit('response', {
                    status: 1,
                    descript: 'พบการแสดงความคิดเห็นแล้ว',
                    data: comment
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
        const sql = "SELECT c_id FROM comments WHERE c_post_id=?";

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
                        tmps.push(data[i].c_id);
                    }

                    return tmps;
                };

                const options = {
                    headers: {'content-type': 'application/json'},
                    url: config.server.host + '/post/comment/list',
                    body: JSON.stringify({comments_id: formats({result: result})})
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
                            descript: 'พบการแสดงความคิดเห็นของโพสต์แล้ว',
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