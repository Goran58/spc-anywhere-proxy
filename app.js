var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');

var secure = require('./routes/secure');
var config = require('./config.json');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/login.htm', function(req, res, next) {
    for (var i = 0; i < config.users.length; i++) {
        if (req.body.userid === config.users[i].user_id &&
            req.body.password === config.users[i].user_pwd) {
            var session_id = (+new Date()).toString(36);
            if (!config.users[i].session_id_1) {
                config.users[i].session_id_1 = ' ';
            }
            else {
                config.users[i].session_id_1 = config.users[i].session_id_2;
            }
            config.users[i].session_id_2 = session_id;
            console.log("** NEW SESSION ID: " + session_id);
            res.redirect('/secure.htm?page=status_summary&session=' + session_id);
            return;
        }
    };
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function (req, res, next) {
    if (req.query.session) {
        var session_id = req.query.session;
        for (var i = 0; i < config.users.length; i++) {
            if (session_id == config.users[i].session_id_1 ||
                session_id == config.users[i].session_id_2) {
                next();
                return;   
            }
        }
    }

    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use('/secure.htm', secure);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    console.log("ERROR HANDLER");
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        console.log("ERROR HANDLER DEVELOPMENT");
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    console.log("ERROR HANDLER PRODUCTION");
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
