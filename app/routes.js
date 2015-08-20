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

  var errortext = "<p>Sorry, nayar dashboard encountered a server error.</p>";
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

  app.get('/poi/:id', function(req, res){
    var query = { table:'Poi',
                   action:'get',
                   id: req.params.id };
    nayar.do(query, function(err, poi){
      poi = poi[0];
      if(poi.poiType === 'geo'){
        poi.poiType = {geo:true, vision:false};
      } else {
        poi.poiType = {geo:false, vision:true};
      }
      var objQuery = { table: 'Object',
                       action: 'get',
                       id: poi.objectID };
      var transQuery = { table: 'Transform',
                         action: 'get',
                         id: poi.transformID };
      var animQuery = { table: 'Animation',
                        action: 'get',
                        poiID: poi.id };
      var actionQuery = { table: 'Action',
                        action: 'get',
                        poiID: poi.id };

      nayar.do(animQuery, function(err, animations){
        nayar.do(actionQuery, function(err, actions){
          nayar.do(transQuery, function(err, transform){
            transform = transform[0];
            nayar.do(objQuery, function(err, object){
              object = object[0];
              var locals = { poi: poi,
                             object: object,
                             transform: transform,
                             actions: actions,
                             animations: animations };
              res.render('poi.hbs',
                          locals,
                          function renderCallback(err, html){
                            if(err){
                              console.error(err);
                              res.status(500).send(errortext);
                            }
                            res.send(html);
              });
            });
          });
        });
      });
    });
  });

  app.get('/help', function(req, res){

  });

  app.get('/new/:table', protect, function(req, res){
    var locals = {};
    locals[req.params.table] = true;
    locals.table = _.capitalize(req.params.table);
    if(req.query.poiID){
      locals.poiID = req.query.poiID;
    }else if(req.query.layerID){
      locals.layerID = req.query.layerID;
    }
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
    if(req.params.table === 'poi'){
      newPOI(req, res);
    } else {
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
    }
  });

  function newPOI(req, res){
    console.log("new poi");
    var objq = extractOptionalForm('object', req.body);
    if(objq){
      objq.table = 'Object';
      objq.action = 'set';
    }

    var trnq = extractOptionalForm('transform', req.body);
    if(trnq) {
      trnq.table = 'Transform';
      trnq.action = 'set';
    }

    var actionsQs = extractOptionalForm('action', req.body);
    var actqs = [];
    _.each(actionsQs, function(value, key){
      var index = parseInt(key.slice(-1), 10);
      if(!this[index]){
        this[index] = {table: 'Action', action: 'set'};
      }
      this[index][key.slice(-2)] = value;
    }, actqs);

    var animationsQs = extractOptionalForm('animation', req.body);
    var aniqs = [];
    _.each(animationsQs, function(value, key){
      var index = parseInt(key.slice(-1), 10);
      if(!this[index]){
        this[index] = {table: 'Animation', action: 'set'};
      }
      this[index][key.slice(-2)] = value;
    }, aniqs);

    var objid = null,
        trnid = null;
    var count = 0;

    var query = { table: _.capitalize(req.params.table),
                  action: 'set'};
    query = _.assign(query, _.omit(req.body, function(value, key){
      return (_.startsWith(key, 'object_') || _.startsWith(key, 'transform_'))
          || (_.startsWith(key, 'action_') || _.startsWith(key, 'animation_'));
    }));
    console.log("queries ready");
    // first insert object and transform. Save insertIds from each insertion.
    // then insert the poi, setting the object and transform ids appropriately.
    // save the insertId from the poi as well.
    // then insert the animations and actions, setting their poiIds appropriately.
    if(objq){
      nayar.do(objq, function(err, results){
        objid = results.insertId;
        count++;
        if(count === 2){
          insertPOI(query, insertArrays);
        }
      });
    }
    if(trnq){
      nayar.do(trnq, function(err, results){
        trnid = results.insertId;
        count++;
        if(count === 2){
          insertPOI(query, insertArrays);
        }
      });
    }

    if(!objq && !trnq){
      console.log("no obj no trn");
      insertPOI(query, insertArrays);
    }

    function insertPOI(q, cb){
      console.log("insert poi");
      q.objectID = objid;
      q.transformID = trnid;
      nayar.do(q, function(err, results){
        var poiID = results.insertId;
        if(aniqs.length || actqs.length){
          cb(poiID, function(){
            res.redirect("/poi/"+poiID);
          });
        } else {
          process.nextTick(function(){
            console.log("redirect!");
            res.redirect("/poi/"+poiID);
          });
        }
      });
    };

    function insertArrays(poiID, cb){
      console.log("insert arrays");
      var total = aniqs.length + actqs.length;
      var count = 0;
      aniqs.forEach(function(q, i){
        nayar.do(q, function(err, results){
          if(++count === total){
            return cb();
          }
        });
      });
      actqs.forEach(function(q, i){
        nayar.do(q, function(err, results){
          if(++count === total){
            return cb();
          }
        });
      });
    };
  };

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

  function extractOptionalForm(table, reqbody){
    var identifier = table+'_';
    var form = _.mapKeys( _.pick(reqbody, function(value, key){
      return _.startsWith(key, identifier);
    }), function(value, key){
      return key.slice(table.length);
    });
    if(!form.length){
      return null;
    } else {
      return form;
    }
  };

  function protect(req, res, next){
    if(!req.user){
      res.redirect('/login');
    } else {
      next();
    }
  }

};
