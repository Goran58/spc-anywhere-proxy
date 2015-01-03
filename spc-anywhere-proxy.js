#!/usr/bin/env node
var debug = require('debug')('spc-anywhere-proxy');
var app = require('./app');
var config = require('./config.json');
var https = require('https');
var fs = require('fs');

var hskey = fs.readFileSync('./cert/spc-anywhere-key.pem');
var hscert = fs.readFileSync('./cert/spc-anywhere-cert.pem')
var options = {
    key: hskey,
    cert: hscert
};

app.set('port', config.proxy_port || 3000);

var server = https.createServer(options, app);
server.listen(app.get('port'));
console.log('spc-anywhere-proxy listening on port ' + server.address().port);
