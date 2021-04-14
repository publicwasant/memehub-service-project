const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const logger = require('./tunnel/logger');

const index_route = require('./api/routes/index');

const user_route = require('./api/routes/user/user');
const user_route__ = require('./api/routes/user/__');
const user_login_route = require('./api/routes/user/login/login');
const user_logout_route = require('./api/routes/user/logout/logout');
const user_register_route = require('./api/routes/user/register/register');
const user_list_router = require('./api/routes/user/list/list');
const user_delete_route = require('./api/routes/user/delete/delete');

const user_follow_route = require('./api/routes/user/follow/follow');
const user_follow_related_route = require('./api/routes/user/follow/related/related.js');
const user_follow_create_route = require('./api/routes/user/follow/create/create');
const user_follow_delete_route = require('./api/routes/user/follow/delete/delete');
const user_follow_followers_route = require('./api/routes/user/follow/followers/followers');
const user_follow_following_route = require('./api/routes/user/follow/following/following');

const user_edit_route = require('./api/routes/user/edit/edit');
const user_edit_info_route = require('./api/routes/user/edit/info/info');
const user_edit_picture_route = require('./api/routes/user/edit/picture/picture');
const user_edit_password_route = require('./api/routes/user/edit/password/password');

const picture_route = require('./api/routes/picture/picture');
const picture_route__ = require('./api/routes/picture/__');
const picture_upload_route = require('./api/routes/picture/upload/upload');
const picture_delete_route = require('./api/routes/picture/delete/delete');

const post_route = require('./api/routes/post/post');
const post_route__ = require('./api/routes/post/__');

const post_newsfeed_route = require('./api/routes/post/newsfeed/newsfeed');
const post_newsfeed_route__ = require('./api/routes/post/newsfeed/__');

const post_create_route = require('./api/routes/post/create/create');
const post_delete_route = require('./api/routes/post/delete/delete');
const post_edit_route = require('./api/routes/post/edit/edit');
const post_list_route = require('./api/routes/post/list/list');

const post_reaction_route = require('./api/routes/post/reaction/reaction');
const post_reaction_route__ = require('./api/routes/post/reaction/__');
const post_reaction_create_route = require('./api/routes/post/reaction/create/create');
const post_reaction_delete_route = require('./api/routes/post/reaction/delete/delete');
const post_reaction_list_route = require('./api/routes/post/reaction/list/list')

const post_comment_route = require('./api/routes/post/comment/comment');
const post_comment_route__ = require('./api/routes/post/comment/__');
const post_comment_create_route = require('./api/routes/post/comment/create/create');
const post_comment_delete_route = require('./api/routes/post/comment/delete/delete');
const post_comment_edit_route = require('./api/routes/post/comment/edit/edit');
const post_comment_list_route = require('./api/routes/post/comment/list/list');

const tunnel_route = require('./tunnel/tunnel');
const port_chess_route = require('./tunnel/port-chess/port_chess');

const app = express();

app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

app.use(cors());
app.use(bodyParser.json());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    next();
});

// var bodyParser = require('body-parser');
// app.use(function (req, res, next) {
//     logger.add({request: req});

//     next();
// });

app.use('/', index_route);

app.use('/user', user_route);
app.use('/user/__', user_route__);
app.use('/user/login', user_login_route);
app.use('/user/logout', user_logout_route);
app.use('/user/register', user_register_route);
app.use('/user/list', user_list_router);
app.use('/user/delete', user_delete_route);

app.use('/user/follow', user_follow_route);
app.use('/user/follow/related', user_follow_related_route);
app.use('/user/follow/create', user_follow_create_route);
app.use('/user/follow/delete', user_follow_delete_route);
app.use('/user/follow/followers', user_follow_followers_route);
app.use('/user/follow/following', user_follow_following_route);

app.use('/user/edit', user_edit_route);
app.use('/user/edit/info', user_edit_info_route);
app.use('/user/edit/picture', user_edit_picture_route);
app.use('/user/edit/password', user_edit_password_route);

app.use('/picture', picture_route);
app.use('/picture/__', picture_route__);
app.use('/picture/upload', picture_upload_route);
app.use('/picture/delete', picture_delete_route);

app.use('/post', post_route);
app.use('/post/__', post_route__);

app.use('/post/newsfeed', post_newsfeed_route);
app.use('/post/newsfeed/__', post_newsfeed_route__);

app.use('/post/create', post_create_route);
app.use('/post/delete', post_delete_route);
app.use('/post/edit', post_edit_route);
app.use('/post/list', post_list_route);

app.use('/post/reaction', post_reaction_route);
app.use('/post/reaction/__', post_reaction_route__);
app.use('/post/reaction/create', post_reaction_create_route);
app.use('/post/reaction/delete', post_reaction_delete_route);
app.use('/post/reaction/list', post_reaction_list_route);

app.use('/post/comment', post_comment_route);
app.use('/post/comment/__', post_comment_route__);
app.use('/post/comment/create', post_comment_create_route);
app.use('/post/comment/delete', post_comment_delete_route);
app.use('/post/comment/edit', post_comment_edit_route);
app.use('/post/comment/list', post_comment_list_route);

// app.use('/eyJ1cmwiOiJ0dW5uZWwifQ', tunnel_route);
app.use('/port-chess', port_chess_route);

app.use(function (req, res) {
    res.status(400);
    res.send('400 Bad request, service not found!');
});

module.exports = app;