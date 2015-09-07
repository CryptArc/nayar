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

  var DEFAULTS = {
    layer: { layer: '',
           refreshInterval: '0',
           fullRefresh: '0',
           showMessage: '',
           poiType: 'geo'},
    poi: {
      showSmallBiw: '0',
      showBiwOnClick: '0',
      inFocus: '0'
    },
    object: { contentType: '',
           url: '',
           size: '',
           previewImage: ''},
    transform: {  rel : '0',
              angle: '0',
              rotate_x: '0',
              rotate_y: '0',
              rotate_z: '0',
              translate_x: '0',
              translate_y: '0',
              translate_z: '0',
              scale_x: '0',
              scale_y: '0',
              scale_z: '0',
              scale: '0' },
    animation: { event: 'onCreate',
             type: 'translate',
             length: '0',
             delay: '0',
             interpolation: 'linear',
             interpolationParam: '0',
             persist: '0',
             repeat: '0',
             'from': '0',
             to: '0',
             axis_x: '0',
             axis_y: '0',
             axis_z: '0' },
    action: { uri: '',
           label: '',
           contentType: '',
           method: 'GET',
           params: '',
           activityType: '0',
           showActivity: '0',
           autoTrigger: '0',
           autoTriggerOnly: '0',
           activityMessage: ''}
  };

  hbs.registerPartials(__dirname + '/templates/partials');

  hbs.registerHelper('selected', function(selected, actual){
    if(selected === actual){
      return new hbs.SafeString("selected");
    } else {
      return new hbs.SafeString("");
    }
  });

  hbs.registerHelper('breadcrumbs', function(bcs, table){
    var markup = "<p class='breadcrumbs'><a href='/layers/'>Layers</a> "+
    "<i class='fa fa-angle-double-right'></i> ";
    if(bcs.layer){
      markup += "<a class='breadcrumb-link' href='/layer/"+
      bcs.layer.id+"'>"+bcs.layer.name+"</a> "+
      "<i class='fa fa-angle-right'></i> ";
    }
    if(bcs.poi){
      markup += "<a class='breadcrumb-link' href='/poi/"+
      bcs.poi.id+"'>"+bcs.poi.name+"</a> "+
      "<i class='fa fa-angle-right'></i> ";
    }
    if(bcs[table] && (table !== 'poi' && table !== 'layer')){
      markup +="<a class='breadcrumb-link' href='/"+table+"/"+bcs[table].id+
      "'>"+bcs[table].name+"</a>";
    }
    return new hbs.SafeString(markup+"</p>");
  });

  // API Endpoint

  app.get('/getpois', function ( req, res ) {
    nayar.getResponse(req.query, function ( err, response ) {
      if(err){
        console.error(err);
        res.status(500).send(err);
      } else {
        res.json(response);
      }
    });
  });

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
      query = { table: 'Poi',
                action:'get',
                layerID: req.params.id };
      nayar.do(query, function(err, pois){
        var counts = [];
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
                nayar.do(actionQuery, function(err, actions){
                  counts.push({ id: poi.id,
                                animationNum: anims.length,
                                actionNum: actions.length });
                  if(counts.length === pois.length) {
                    // match anim and action counts to pois
                    pois = pois.map(function(v, i){
                      v.animationNum = _.pluck(_.where(counts,
                                             {id:v.id}),
                                             'animationNum');
                      v.actionNum = _.pluck(_.where( counts,
                                            {id:v.id}),
                                            'actionNum');
                      return v;
                    });
                    var locals = { layer: layer, pois: pois };
                    if(req.query.saved){
                      locals.saved = true;
                    }
                    getBreadcrumbs(locals, 'layer', req.params.id,
                    function(breadcrumbs){
                      locals.breadcrumbs = breadcrumbs;
                      res.render('layer.hbs',
                              locals,
                              function renderCallback(err, html){
                                if(err){
                                  console.error(err);
                                  res.status(500).send(errortext);
                                }
                                res.send(html);
                      });
                    });
                  }
                });
              });
            })(poi, animQuery, actionQuery);
          });
        } else {
          var locals = { layer: layer, pois: [] };
          if(req.query.saved){
            locals.saved = true;
          }
          getBreadcrumbs(locals, 'layer',
                    req.params.id, function(breadcrumbs){
            locals.breadcrumbs = breadcrumbs;
            res.render('layer.hbs',
                        locals,
                        function renderCallback(err, html){
                          if(err){
                            console.error(err);
                            res.status(500).send(errortext);
                          }
                          res.send(html);
            });
          });
        }
      });
    });
  });

  app.get('/poi/:id', protect, function(req, res){
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
              if(req.query.saved){
                locals.saved = true;
              }
              getBreadcrumbs(locals, 'poi', req.params.id,
              function(breadcrumbs){
                locals.breadcrumbs = breadcrumbs;
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

  app.post('/new/:table', protect, function(req, res){
    var query;
    if(req.params.table === 'poi'){
      newPOI(req, res);
    } else if(req.params.table === 'object'
    || req.params.table === 'transform') {
      var poiID = req.body.poiID;
      query = { table: _.capitalize(req.params.table),
                    action: 'set'};
      req.body = _.defaults(req.body, DEFAULTS[req.params.table]);
      _.forOwn(req.body, function(v, k, o){
        if(v === 'on'){
          o[k] = '1';
        }
      });
      query = _.assign(query, _.omit(req.body, 'poiID'));
    } else {
      query = { table: _.capitalize(req.params.table),
                    action: 'set'};
      req.body = _.defaults(req.body, DEFAULTS[req.params.table]);
      _.forOwn(req.body, function(v, k, o){
        if(v === 'on'){
          o[k] = '1';
        }
      });
      query = _.assign(query, req.body);
    }
    if(req.params.table !== 'poi'){
      nayar.do(query, function(err, results){
        if(err){
          console.error(err);
          res.status(500).send(errortext);
        } else {
          if(req.params.table === 'object'
          || req.params.table === 'transform') {
            var updateq = { table: 'Poi',
                       action: 'update',
                       id: poiID };
            updateq[req.params.table+"ID"] = results.insertId;
            nayar.do(updateq, function(err, results){
              res.redirect("/"+req.params.table
              +"/"+updateq[req.params.table+"ID"]);
            });
          } else {
            res.redirect("/"+req.params.table+"/"+results.insertId);
          }
        }
      });
    }
  });

  function newPOI(req, res){
    var objq = extractOptionalForm('object', req.body);

    var trnq = extractOptionalForm('transform', req.body);

    var actqs = extractOptionalForm('action', req.body);

    var aniqs = extractOptionalForm('animation', req.body);

    var objid = null,
        trnid = null;
    var count = 0;

    var query = { table: _.capitalize(req.params.table),
                  action: 'set'};
    req.body = _.defaults(req.body, DEFAULTS[req.params.table]);
    query = _.assign(query, _.omit(req.body, function(value, key){
      return (_.startsWith(key, 'object_') || _.startsWith(key,'transform_'))
      || (_.startsWith(key, 'action_') || _.startsWith(key, 'animation_'));
    }));
    // first insert object and transform. Save insertIds from each insertion.
    // then insert the poi, setting the object and transform ids appropriately.
    // save the insertId from the poi as well.
    // then insert the animations and actions, setting their poiIds appropriately.
    if(objq && !trnq){
      nayar.do(objq, function(err, results){
        objid = results.insertId;
        insertPOI(query, insertArrays);
      });
    } else if(trnq && !objq){
      nayar.do(trnq, function(err, results){
        trnid = results.insertId;
        insertPOI(query, insertArrays);
      });
    } else if(trnq && objq){
      nayar.do(trnq, function(err, results){
        trnid = results.insertId;
        nayar.do(objq, function(err, results){
          objid = results.insertId;
          insertPOI(query, insertArrays);
        });
      });
    } else {
      insertPOI(query, insertArrays);
    }

    function insertPOI(q, cb){
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
            res.redirect("/poi/"+poiID);
          });
        }
      });
    };

    function insertArrays(poiID, cb){
      var total = aniqs.length + actqs.length;
      var count = 0;
      aniqs.forEach(function(q, i){
        q.poiID = poiID;
        nayar.do(q, function(err, results){
          if(++count === total){
            return cb();
          }
        });
      });
      actqs.forEach(function(q, i){
        q.poiID = poiID;
        nayar.do(q, function(err, results){
          if(++count === total){
            return cb();
          }
        });
      });
    };
  };

  app.get('/:table/:id', protect, function (req, res) {
    var query = { table: _.capitalize(req.params.table),
                  action: 'get',
                  id: req.params.id };
    nayar.do(query, function(err, results){
      var locals = results[0];
      if(req.query.saved){
        locals.saved = true;
      }
      getBreadcrumbs(locals, req.params.table, req.params.id,
        function(breadcrumbs){
        locals.breadcrumbs = breadcrumbs;
        res.render(req.params.table+'.hbs',
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
    });
  });

  app.post('/:table/:id', protect, function (req, res) {
    var query = { table: _.capitalize(req.params.table),
                  action: 'update',
                  id: req.params.id };
    req.body = _.defaults(req.body, DEFAULTS[req.params.table]);
    _.forOwn(req.body, function(v, k, o){
      if(v === 'on'){
        o[k] = '1';
      }
    });
    console.dir(req.body);
    _.assign(query, req.body);
    nayar.do(query, function(err, results){
      res.redirect('/'+req.params.table+'/'+req.params.id+'?saved=1');
    });
  });

  app.delete('/:table/:id', protect, function(req, res){
    if(req.params.table === 'object' ||
       req.params.table === 'transform'){
      //  need to set poi params to null
      var query = { table: 'Poi', action: 'get' };
      query[req.params.table+"ID"] = req.params.id;
      nayar.do(query, function(err, result){
        query = { table: 'Poi', action: 'update', id: result[0].id };
        query[req.params.table+"ID"] = null;
        nayar.do(query, function(err, result){
          query = { table: _.capitalize(req.params.table),
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
      });
    } else if(req.params.table === 'poi'){
      // delete all related objects, transforms, actions and animations
      var query = { table: 'Poi', action: 'get', id: req.params.id };
      nayar.do(query, function(err, result){
        var deleteqs = [{ table: 'Object',
                        action: 'delete',
                        id: result[0].objectID },
                       { table: 'Transform',
                        action: 'delete',
                        id: result[0].transformID },
                       { table: 'Action',
                        action: 'delete',
                        poiID: req.params.id },
                       { table: 'Animation',
                        action: 'delete',
                        poiID: req.params.id }];
        _.each(deleteqs, function(v, k){
          nayar.do(v, function(err, result){
          });
        });
        query = { table: _.capitalize(req.params.table),
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
    } else if(req.params.table === 'layer'){
      // delete all related pois, and their objects, transforms...etc
      var query = { table: 'Layer', action: 'get', id: req.params.id };
      nayar.do(query, function(err, result){
        // this will delete all the POIs attached to the layer,
        // but we need to go through all of them and
        var deleteqs = [{ table: 'Poi',
                        action: 'delete',
                        layerID: result[0].id}];
        query = { table: 'Poi',
                  action: 'get',
                  layerID: result[0].id };
        nayar.do(query, function(err, result){
          _.each(result, function(v, k){
            deleteqs.push({ table: 'Object',
                            action: 'delete',
                            id: v.objectID });
            deleteqs.push({ table: 'Transform',
                            action: 'delete',
                            id: v.transformID });
            deleteqs.push({ table: 'Action',
                            action: 'delete',
                            poiID: v.id });
            deleteqs.push({ table: 'Animation',
                            action: 'delete',
                            poiID: v.id });
          });
          _.each(deleteqs, function(v, k){
            nayar.do(v, function(err, result){
            });
          });
          query = { table: _.capitalize(req.params.table),
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
      });
    }

  });

  app.get('/', function(req, res){
    var locals = {user: null};
    if(req.user) locals.user = req.user;
    res.render('index.hbs', locals, function renderCallback(err, html){
      if(err) res.status(500).send(errortext);
      res.send(html);
    });
  });

  function getBreadcrumbs(locals, table, id, cb){
    if(table === 'layer'){
      process.nextTick(function(){
        return cb({ layer: {name:locals.layer.layer, id:id} });
      });
    } else if(table === 'poi'){
      var q = { table: 'Layer', action: 'get', id: locals.poi.layerID };
      nayar.do(q, function(err, results){
        var layer = results[0];
        var bc = { layer: {name:layer.layer, id:layer.id },
                   poi: {name: "poi: "+ locals.poi.id,
                       id: locals.poi.id } };
        cb(bc);
      });
    } else if(table === 'object' || table === 'transform'){
        var Table = _.capitalize(table);
        var q = { table: 'Poi', action: 'get' };
        q[Table+"ID"] = id;
        nayar.do(q, function(err, results){
          var poi = results[0];
          if(poi){
            q = { table: 'Layer', action: 'get', id: poi.layerID };
            nayar.do(q, function(err, results){
              var layer = results[0];
              var bc = { layer: {name: layer.layer, id: layer.id },
                         poi: {name: "poi: " + poi.id, id: poi.id } };
              bc[table] = { name: table+": "+id, id: id };
              return cb(bc);
            });
          } else {
            // this object or transform is orphaned!
            return cb({});
          }
        });
    } else if(table === 'animation' || table === 'action'){
      var q = { table: 'Poi', action: 'get', id: locals.poiID};
      nayar.do(q, function(err, results){
        var poi = results[0];
        q = { table: 'Layer', action: 'get', id: poi.layerID };
        nayar.do(q, function(err, results){
          var layer = results[0];
          var bc = { layer: { name: layer.layer, id: layer.id },
                     poi: { name: "poi: " + poi.id, id: poi.id } };
              bc[table] = { name: table + ": " + id, id: id };
          return cb(bc);
        })
      });
    }
  };

  function extractOptionalForm(table, reqbody){
    var identifier = table+'_';
    var form = _.mapKeys( _.pick(reqbody, function(value, key){
      return _.startsWith(key, identifier);
    }), function(value, key){
      var newkey = key.slice(identifier.length);
      return newkey;
    });
    if(!_.keys(form).length){
      return null;
    } else {
      if(table === 'object' || table === 'transform'){
        form = _.defaults(form, DEFAULTS[table]);
        form.table = _.capitalize(table);
        form.action = 'set';
      } else if(table === 'animation' || table === 'action') {
        var qs = [];
        _.each(form, function(value, key){
          var index = parseInt(key.slice(-1), 10);
          if(!this[index]){
            this[index] = {table: _.capitalize(table), action: 'set'};
          }
          this[index][key.slice(0, -2)] = value;
        }, qs);
        _.each(qs, function(value, index){
          qs[index] = _.defaults(qs[index], DEFAULTS[table]);
        });
        form = qs;
      }
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
