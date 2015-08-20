/*
 * nayar/app/server.js
 * https://github.com/thomasrstorey/nayar
 *
 * Copyright (c) 2015 thomasrstorey
 * Licensed under the MIT license.
 */

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(express.static(__dirname));
app.set('views', __dirname + '/templates');
app.set('view engine', 'hbs');
app.use(session({ secret: 'nayar is cool',
                  resave: false,
                  saveUninitialized: false }));

var port = process.env.PORT || 8188;
require(path.join(__dirname, './routes.js'))(app);

app.listen(port);
console.log("nayar webservice listening on: " + port);
