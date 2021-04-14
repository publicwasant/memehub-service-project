const jwt = require('jwt-simple');
const jwt_decode = require('jwt-decode');
const passport = require('passport');
const ExtractJwt = require('passport-jwt').ExtractJwt;
const JwtStrategy = require('passport-jwt').Strategy;

const database = require('./database');

const secrect_key = 'golden';

module.exports = {
    token: function (user_id, iat) {
        return jwt.encode({
            sub: user_id,
            iat: iat
        }, secrect_key);
    },
    full_token: function (user_id, username, iat) {
        return jwt.encode({
            sub: user_id,
            username: username,
            iat: iat
        }, secrect_key);
    },
    decode: function (token) {
        return jwt_decode(token);
    },
    middle: function () {
        const options = {
            jwtFromRequest: ExtractJwt.fromHeader('authorization'),
            secretOrKey: secrect_key,
        };
        
        passport.use(new JwtStrategy(options, function (payload, done) {
            const sql = "SELECT u_iat FROM users WHERE u_id=?";
            
            database.query(sql, [payload.sub], function (err, result) {
                if (err) {
                    return done(null, false);
                }
        
                if (result.length == 1) {
                    if (payload.iat == result[0].u_iat) {
                        return done(null, true);
                    }
                }
        
                return done(null, false);
            });
        }));

        return passport.authenticate('jwt', {session: false})
    }
};