/*
 * nayar/app/routes.js
 * https://github.com/thomasrstorey/nayar
 *
 * Copyright (c) 2015 thomasrstorey
 * Licensed under the MIT license.
 */

module.exports = function(app){
  var _ = require('lodash');
  var path = require('path'),
      passport = require('passport');
  app.use(passport.initialize());
  app.use(passport.session());
  var auth = require('./auth.js')(passport);
  var hbs = require('hbs');
  var jsf = require('jsonfile');
  var nayar = require('../lib/nayar.js');

  var errortext = "<p>Sorry, the nayar dashboard encountered some sort of server error.</p>";
  var config = jsf.readFileSync(path.join(__dirname, '../lib/config.json'));

  hbs.registerPartials(__dirname + '/templates/partials');

  // API Endpoints



  // Dashboard Routing

  app.post('/register',
    passport.authenticate('local-register', { successRedirect: '/?auth=1',
                                              failureRedirect: '/register',
                                              failureFlash: true})
  );

  app.post('/login',
           passport.authenticate('local-login', { successRedirect: '/?auth=1',
                                                  failureRedirect: '/login',
                                                  failureFlash: true})
  );

  app.get('/register', function(req, res){
    var locals = {user: null, message: null, locked: false};
    nayar.do({table:'User', action:'get'}, function(err, rows){
      if(rows.length > 0) locals.locked = true;
      if(req.user) locals.user = req.user;
      if(req.message) locals.message = req.message;
      res.render('register.hbs', locals, function renderCallback(err, html){
        if(err) res.status(500).send(errortext);
        res.send(html);
      });
    });
  });

  app.get('/login', function(req, res){
    var locals = {user: null, message: null};
    if(req.user) locals.user = req.user;
    if(req.message) locals.message = req.message;
    res.render('login.hbs', locals, function renderCallback(err, html){
      if(err) res.status(500).send(errortext);
      res.send(html);
    });
  });

  app.get('/layers/', protect, function(req, res){
    nayar.do({table:'Layer', action:'get'}, function(err, rows){
      var locals = {layers: rows, error: err};
      res.render('layers.hbs', locals, function renderCallback(err, html){
        if(err){
          console.error(err);
          res.status(500).send(errortext);
        }
        res.send(html);
      });
    });
  });

  app.get('/layer/:id', protect, function(req, res){
    console.log("get layer: " + req.params.id);
    var query = { table:'Layer',
                   action:'get',
                   id: req.params.id };
    nayar.do(query, function(err, layer){
      layer = layer[0];
      if(layer.poiType === 'geo'){
        layer.poiType = {geo:true, vision:false};
      } else {
        layer.poiType = {geo:false, vision:true};
      }
      console.dir(layer);
      query = { table: 'Poi',
                action:'get',
                layerID: req.params.id };
      nayar.do(query, function(err, pois){
        var counts = [];
        console.dir(pois);
        if(pois.length){
          pois.forEach(function(poi, key){
            var animQuery = { table: 'Animation',
                              action: 'get',
                              poiID: poi.id };
            var actionQuery = { table: 'Action',
                              action: 'get',
                              poiID: poi.id };

            // IIFE to close over poi value
            (function IIFE(){
              nayar.do(animQuery, function(err, anims){
              console.dir(anims);
              nayar.do(actionQuery, function(err, actions){
                console.dir(actions);
                counts.push({ id: poi.id,
                              animationNum: anims.length,
                              actionNum: actions.length });
                if(counts.length === pois.length){
                  // match anim and action counts to pois
                  pois = pois.map(function(v, i){
                    v.animationNum = _.pluck(_.where( counts,
                                                      {id:v.id}),
                                                      'animationNum');
                    v.actionNum = _.pluck(_.where( counts,
                                                   {id:v.id}),
                                                   'actionNum');
                    return v;
                  });
                  var locals = { layer: layer, pois: pois };
                  res.render('layer.hbs',
                              locals,
                              function renderCallback(err, html){
                                if(err){
                                  console.error(err);
                                  res.status(500).send(errortext);
                                }
                                res.send(html);
                  });
                }
              });
            })})(poi, animQuery, actionQuery);

          });
        } else {
          var locals = { layer: layer, pois: [] };
          res.render('layer.hbs',
                      locals,
                      function renderCallback(err, html){
                        if(err){
                          console.error(err);
                          res.status(500).send(errortext);
                        }
                        res.send(html);
          });
        }
      });
    });
  });

  app.get('/help', function(req, res){

  });

  app.get('/new/:table', protect, function(req, res){
    var locals = {};
    locals[req.params.table] = true;
    locals.table = _.capitalize(req.params.table);
    res.render('new.hbs',
                locals,
                function renderCallback(err, html){
                  if(err){
                    console.error(err);
                    res.status(500).send(errortext);
                  } else {
                    res.send(html);
                  }
    });
  });

  app.post('/new/:table', function(req, res){
    var query = { table: _.capitalize(req.params.table),
                  action: 'set'};
    query = _.assign(query, req.body);
    nayar.do(query, function(err, results){
      if(err){
        console.error(err);
        res.status(500).send(errortext);
      } else {
        res.redirect("/"+req.params.table+"/"+results.insertId);
      }
    });
  });

  app.delete('/:table/:id', function(req, res){
    var query = { table: _.capitalize(req.params.table),
                  action: 'delete',
                  id: req.params.id };
    nayar.do(query, function(err, results){
      if(err){
        console.error(err);
        res.status(500).send(errortext);
      } else {
        res.redirect("./");
      }
    });
  });

  app.get('/', function(req, res){
    var locals = {user: null};
    if(req.user) locals.user = req.user;
    res.render('index.hbs', locals, function renderCallback(err, html){
      if(err) res.status(500).send(errortext);
      res.send(html);
    });
  });

  function protect(req, res, next){
    if(!req.user){
      res.redirect('/login');
    } else {
      next();
    }
  }

};
