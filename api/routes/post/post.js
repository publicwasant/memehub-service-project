
const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');
const request = require('request');
const date_format = require('dateformat');

const JWTToken = require('./../../../jwt_token');
const database = require('./../../../database');

const router = express.Router();

router.get('/', function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_post.json'));
    
    const input = url.parse(req.url, true).query;
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('start', function (_attach_) {
        if (input.id) {
            return emitter.emit('id_search', {});
        } else if (input.user_id) {
            return emitter.emit('user_id_search', {});
        } else if (input.date) {
            return emitter.emit('date_search');
        } else {
            return res.status(404).end('404 Not found.');
        }
    });

    emitter.on('id_search', function (_attach_) {
        const sql = "SELECT * FROM posts WHERE pt_id=?";

        database.query(sql, [input.id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }

            if (result.length != 0) {
                return emitter.emit('prep_post', {
                    post: {
                        id: result[0].pt_id,
                        date: result[0].pt_date,
                        time: result[0].pt_time,
                        owner: {
                            id: result[0].pt_user_id,
                        },
                        material: {
                            caption: result[0].pt_text_caption,
                            picture: {
                                id: result[0].pt_picture_id
                            }
                        }
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

    emitter.on('prep_post', function (_attach_) {
        const post = _attach_.post;

        output.data.id = post.id;
        output.data.date = date_format(new Date(post.date), 'yyyy-mm-dd');
        output.data.time = post.time;
        output.data.material.caption = post.material.caption;

        output.data.material.picture = (post.material.picture.id != null) ? {
            id: post.material.picture.id,
            raw: config.server.host + '/picture?id=' + post.material.picture.id,
            show: config.server.host + '/picture?idx=' + post.material.picture.id
        } : null;
    
        return emitter.emit('modify_token', {post: post});
    });

    emitter.on('modify_token', function (_attach_) {
        const post = _attach_.post;
        const sql = "SELECT u_iat FROM users WHERE u_id=?";
        
        database.query(sql, [post.owner.id], function (err, result) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!',
                    err: err
                });
            }

            if (result.length != 0) {
                const iat = result[0].u_iat;
                const token = JWTToken.token(post.owner.id, iat);

                return emitter.emit('prep_owner', {post: post, token: token});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดในการสร้าง token!'
                });
            }
        });
    });

    emitter.on('prep_owner', function (_attach_) {
        const token = _attach_.token;
        const post = _attach_.post;

        const options = {
            headers: {'content-type': 'application/json', 'authorization': token},
            url: config.server.host + '/user?id=' + post.owner.id
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
                output.data.owner = result.data.list[0];
                
                return emitter.emit('prep_reaction', {post: post});
            } else {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!'
                });
            }
        });
    });

    emitter.on('prep_reaction', function (_attach_) {
        const post = _attach_.post;

        const options = {
            headers: {'content-type': 'application/json'},
            url: config.server.host + '/post/reaction?post_id=' + post.id
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
                output.data.activities.reaction = result.data;

                return emitter.emit('prep_comment', {post: post});
            } else {
                output.data.activities.reaction = {found: 0, list: []};

                return emitter.emit('prep_comment', {post: post});
            }
        });
    });

    emitter.on('prep_comment', function (_attach_) {
        const post = _attach_.post;

        const options = {
            headers: {'content-type': 'application/json'},
            url: config.server.host + '/post/comment?post_id=' + post.id
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
                output.data.activities.comments = result.data;

                return emitter.emit('response', {
                    status: 1,
                    descript: 'พบโพสต์แล้ว',
                    data: output.data
                });
            } else {
                output.data.activities.comments = {found: 0, list: []};

                return emitter.emit('response', {
                    status: 1,
                    descript: 'พบโพสต์แล้ว',
                    data: output.data
                });
            }
        });

    });

    emitter.on('user_id_search', function (_attach_) {
        const sql = "SELECT pt_id FROM posts WHERE pt_user_id=? ORDER BY pt_id DESC";

        database.query(sql, [input.user_id], function (err, result) {
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
                        tmps.push(data[i].pt_id);
                    }

                    return tmps;
                };

                const options = {
                    headers: {'content-type': 'application/json'},
                    url: config.server.host + '/post/list',
                    body: JSON.stringify({posts_id: formats({result: result})})
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
                            descript: 'พบโพสต์ของผู้ใช้แล้ว',
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

    emitter.on('date_search', function (_attach_) {
        const sql = "SELECT pt_id FROM posts WHERE pt_date=? ORDER BY pt_id DESC";

        database.query(sql, [input.date], function (err, result) {
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
                        tmps.push(data[i].pt_id);
                    }

                    return tmps;
                };

                const options = {
                    headers: {'content-type': 'application/json'},
                    url: config.server.host + '/post/list',
                    body: JSON.stringify({posts_id: formats({result: result})})
                };

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
                            descript: 'พบโพสต์ของผู้ใช้แล้ว',
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