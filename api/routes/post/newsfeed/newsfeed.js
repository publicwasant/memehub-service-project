
const express = require('express');
const fs = require('fs');
const url = require('url');
const events = require('events');
const request = require('request');

const JWTToken = require('./../../../../jwt_token');
const database = require('./../../../../database');
const { emit } = require('./../../../../database');
const { json } = require('body-parser');

const router = express.Router();


router.get('/', function (req, res) {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const fg = JSON.parse(fs.readFileSync(__dirname+'/fg_newsfeed.json'));
    
    const input = url.parse(req.url, true).query;
    const output = fg.output;

    const emitter = new events.EventEmitter();

    emitter.on('choose', function (_attach_) {
        if (input.user_id) {
            return emitter.emit('user_id_search', {user_id: input.user_id});
        }
    });

    emitter.on('user_id_search', function (_attach_) {
        const token = req.headers.authorization;
        const user_id = _attach_.user_id;
        const options = {
            headers: {'content-type': 'application/json', 'authorization': token},
            url: config.server.host + '/user/follow/following',
            body: JSON.stringify({user_id: user_id})
        }

        request.post(options, function(err, response, body) {
            if (err) {
                return emitter.emit('response', {
                    status: 0,
                    descript: 'เกิดข้อผิดพลาดบางอย่าง!',
                    err: err
                });
            }
            
            result = JSON.parse(body);

            if (result.status != 0) {
                result.data.found += 1;
                result.data.list.push({id: user_id});

                return emitter.emit('prep_post', {data: result.data});
            } else {
                return emitter.emit('response', result); 
            }
        });
    });

    emitter.on('prep_post', function (_attach_) {
        const data = _attach_.data;
        const source = [];

        const prep_post = (count) => {
            if (count < data.found) {
                const option = options = {
                    headers: {'content-type': 'application/json'},
                    url: config.server.host + '/post?user_id=' + data.list[count].id
                };

                request.get(option, function(err, response, body) {
                    const result = JSON.parse(body);

                    if (result.status != 0) {
                        source.push(result.data.list);
                    }
                    
                    return prep_post(count+1);
                });
            } else {
                if (source.length != 0) {
                    return emitter.emit('random_feeding', {source: source});
                } else {
                    return emitter.emit('response', {
                        status: 0,
                        descript: 'ไม่พบโพสต์!'
                    });
                }
            }
        };

        return prep_post(0);
    });

    emitter.on('random_feeding', function (_attach_) {
        const source = _attach_.source;
        const finish = [];
        const feed = [];

        while (source.length != finish.length) {
            let ind = Math.floor(Math.random() * source.length);

            if (source[ind].length == 0) {
                if (!finish.includes(ind)) {
                    finish.push(ind);
                }
            } else {
                feed.push(source[ind].shift());
            }
        }

        return emitter.emit('response', {
            status: 1,
            descript: 'พบโพสต์แล้ว',
            data: {
                found: feed.length,
                list: feed
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

    return emitter.emit('choose', {});
});

module.exports = router;