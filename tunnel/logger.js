const fs = require('fs');
const node_datetime = require('node-datetime');

module.exports = {
    add: function (_data_) {
        const request = _data_.request;

        if (request.originalUrl != '/eyJ1cmwiOiJ0dW5uZWwifQ' && request.originalUrl != '/favicon.ico') {
            const config = JSON.parse(fs.readFileSync('./config.json'));
            const logs = JSON.parse(fs.readFileSync('./tunnel/saved/logs.json'));

            logs.push({
                date: node_datetime.create().format('Y-m-d H:M:S'),
                ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
                method: request.method,
                URL: config.server.host + request.originalUrl,
                JWT_token: (request.headers.authorization == null ? 'null' : request.headers.authorization),
                body: request.body
            });
            
            fs.writeFileSync('./tunnel/saved/logs.json', JSON.stringify(logs));
        }
    },
    load: function () {
        return JSON.parse(fs.readFileSync('./tunnel/saved/logs.json'));
    }
};