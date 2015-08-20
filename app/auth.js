/*
 * nayar/app/auth.js
 * https://github.com/thomasrstorey/nayar
 *
 * Copyright (c) 2015 thomasrstorey
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(passport){

  var nayar       = require('../lib/nayar.js'),
      crypto        = require('crypto'),
      uuid          = require('node-uuid'),
      LocalStrategy = require('passport-local').Strategy;

  passport.serializeUser(function(user, done){
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done){
    nayar.do({table:'User', action:'get', id: id}, function(err, rows){
      done(err, rows[0]);
    });
  });

  passport.use('local-register', new LocalStrategy({
    passReqToCallback : true
  }, function (req, username, password, done){
      nayar.do({table : 'User', action : 'get', username : username},
      function(err, rows){
        if(err) return done(err);
        if(rows.length) {
          return done(null, false,
                      req.flash('registermsg', 'Username already in use.'));
        } else {
          var salt = uuid.v1();
          var passhash = hash(password, salt);
          nayar.do({table : 'User',
                      action : 'set',
                      username : username,
                      passhash : passhash,
                      salt : salt},
                      function(err, result){
                        if(err) return done(err);
                        return done(null, {
                          id : result.insertId,
                          username : username,
                          password : password
                        });
                      });
        }
      });
  }));

  passport.use('local-login', new LocalStrategy({
    passReqToCallback : true
  }, function(req, username, password, done) {
      nayar.do({table:'User', action:'get', username:username},
                 function(err, rows){
                   if(err) return done(err);
                   if(!rows.length){
                     return done(null, false,
                                 req.flash('loginmsg', 'User not found.'));
                   }
                   if(!isValidPassword(password, rows[0])){
                     return done(null, false,
                                 req.flash('loginmsg', 'Wrong password.'))
                   }
                   return done(null, {
                     id : rows[0].id,
                     username : rows[0].username,
                     password : password
                   });
                 });
  }));

  function hash (passwd, salt) {
    return crypto.createHmac('sha256', salt).update(passwd).digest('hex');
  };

  function isValidPassword (passstr, user) {
    return user.passhash === hash(passstr, user.salt);
  };

};
