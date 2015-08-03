/*
 * nayar
 * https://github.com/thomasrstorey/nayar
 *
 * Copyright (c) 2015 thomasrstorey
 * Licensed under the MIT license.
 */

'use strict';

var nayar = function(){

  var mysql = require('mysql');
  var _ = require('lodash');
  var geolib = require('geolib');
  var defaultConfig = {
    host : 'localhost',
    user : 'user',
    password : 'pass'
  };
  var config = {};
  var conn = null;
  config = _.defaults(config, defaultConfig);

  // use default config if no custom config is provided
  // otherwise overwrite default parameters with custom
  // config options: https://www.npmjs.com/package/mysql#connection-options
  function setConfig(customConfig){
    config = {}; // reset config to empty object
    customConfig = customConfig||{};
    // assign copies to the first arg, from left to right
    config = _.assign(config, defaultConfig, customConfig);
  };

  function getConfig(){
    return _.clone(config);
  }

  function getPOIs(query, cb) {
    // validate query
    if(!validate(query)){
      return cb(getErrorResponse(new Error("invalid request"),query));
    }
    // connect to db
    if(!conn) conn = connectToDB();
    // determine if layer requested is geo or vision
    if(conn){
      try{
        getLayer(conn, query, function(err, layer){
          if(err){
            console.error(err);
            throw err;
          }
          // get poi data from database
          getRawPOIs(conn, query, layer, function(err, rawpois, params){
            if(err){
              console.error(err);
              throw err;
            }
            // format and return response json to callback
            var resjson = getResponse(rawpois, params);
            return cb(resjson);
          });
        });
      } catch (e){
        return cb(getErrorResponse(e));
      }
    }
  };

  function validate(q){
    // list of all required request parameters
    var params = ["userId",
                  "layerName",
                  "version",
                  "lat",
                  "lon",
                  "countryCode",
                  "lang",
                  "action"];
    // true if q has a key for each param item p
    return _.every(params, function(p){return _.has(q, p)});
  }

  function getLayer(conn, params, cb) {
    // console.log("find layer: " + params.layerName);
    var qstr = 'SELECT id, layer, poiType FROM Layer WHERE layer = "';
    qstr = qstr + params.layerName+'" LIMIT 0, 1;';
    // console.log(qstr);
    conn.query(qstr, function (err, rows, fields){
      if(err) handleMysqlErr(err, cb);
      if(rows.length === 0){
        return cb(new Error("no layers found with that layer name"));
      } else {
        // should only find one layer, so just return the first
        // console.log("found layer: " + rows[0].layer);
        return cb(null, rows[0]);
      }
    });
  };

  // construct and async send query to database, invoke callback on response
  function getRawPOIs(conn, params, layer, cb){
    // console.log("get raw POIs for layer: " + layer.layer);
    var poiType = layer.poiType;
    var layerID = layer.id;
    // mandatory fields
    var qstr = 'SELECT id, ';
    // type-specific fields
    if(poiType === "geo"){
      qstr += 'title, description, footnote, imageURL, anchorID, ';
      qstr += 'objectID, transformID, animationID, ';
      qstr += 'showSmallBiw, showBiwOnClick, biwStyle, icon_url, icon_type, ';
      qstr += 'inFocus FROM Poi WHERE poiType = "geo" AND layerID = '+layerID;
      qstr += ' LIMIT 0, 50;';
    } else if (poiType === "vision"){
      qstr += 'anchorID, objectID, transformID, animationID ';
      qstr += 'FROM Poi WHERE poiType = "vision" AND layerID = '+layerID;
      qstr += ' LIMIT 0, 50;';
    } else {
      return cb(new Error("invalid poiType"), null, null);
    }
    // make query
    // console.log(qstr);
    conn.query(qstr, function (err, layerPOIs, fields){
      if(err) handleMysqlErr(err, cb);
      // we have the global list of POIs for this layer.
      // now we need their anchors
      getAnchors(conn, layerPOIs, function(err, anchoredPois){
          // if(err) handleMysqlErr(err, cb);
          // layerPOIs with their matching anchors and filter them
          var pois = filterPOIs(anchoredPois, params);
          // now we have a list of all the pois we are actually interested in
          // make a list of queries for them
          var queries = makeQueries(pois, params);
          // execute all queries, call callback once they are all done
          executeQueries(conn, pois, queries, function(err, rawpois){
            // if(err) handleMysqlErr(err, cb);
            // raw pois has the completed but unformatted poi data
            return cb(null, rawpois, params);
          });
      });
    });
  };

  function getAnchors(conn, pois, cb){
    // XXX: gets anchors per poi, which strucutrally makes sense but may not be
    // the most efficient. Faster to get with one query to a layerID?
    // Disadvantage of that approach: will have to match up anchors and pois.
    var anchors = [];
    var i = 0;
    pois.forEach(function(poi){
      var qstr = 'SELECT referenceImage, lat, lon, geolocation, poiID ';
      qstr += ' FROM Anchor WHERE id = "'+poi.anchorID+'" LIMIT 0, 1;';
      // console.log(qstr);
      conn.query(qstr, function(err, rows, fields){
        if(err) handleMysqlErr(err, cb);
        (function(poi, anch){
          // console.dir(anch);
          poi.anchor = _.cloneDeep(anch);
          if(++i === pois.length){
            return cb(null, pois);
          }
        })(poi, rows[0]);
      });
    });
  };

  function makeQueries(pois, params){
    // take array of pois, use their various ids to construct mysql queries
    // add these queries to an array and return the array
    var qs = [];
    pois.forEach(function(poi){
      // actions query
      var q = 'SELECT label, uri, contentType, activityType, autoTrigger, ';
      q += 'autoTriggerOnly, params FROM Actions WHERE poiID = "'+poi.id+'";';
      qs.push({string: q, type: 'actions', id: poi.id});
      // animations query
      q = 'SELECT id, event, type, length, delay, interpolation, ';
      q += "interpolationParam, persist, `repeat`, `from`, `to`, axis_x, ";
      q += 'axis_y, axis_z FROM Animation WHERE poiID = "'+poi.id+'";';
      qs.push({string: q, type: 'animations', id: poi.id});
      // object query
      if(poi.objectID){
          q = 'SELECT contentType, url, size FROM Object WHERE id = "';
          q += poi.objectID+'" LIMIT 0, 1;';
          qs.push({string: q, type: 'object', id: poi.id});
      }
      // transform query
      if(poi.transformID){
        q = 'SELECT rel, angle, rotate_x, rotate_y, rotate_z, translate_x, ';
        q += 'translate_y, translate_z, scale_x, scale_y, scale_z, scale FROM ';
        q += 'Transform WHERE id = "'+poi.transformID+'" LIMIT 0, 1;';
        qs.push({string: q, type: 'transform', id: poi.id});
      }
    });
    return qs;
  };

  function executeQueries(conn, pois, qs, cb){
    // execute all queries and execute callback when they are all done.
    var i = 0;
    // pois = _.cloneDeep(pois);
    qs.forEach(function(q, i){
      (function(q){
        // console.log(q.string);
        conn.query(q.string, function(err, rows, fields) {
          if(err) handleMysqlErr(err, cb);
          var poi = _.find(pois, function(p){return p.id === q.id});
          if(rows.length > 1){
            poi[q.type] = rows;
          } else {
            poi[q.type] = rows[0];
          }
          if(++i === qs.length){
            return cb(null, pois);
          }
        });
      })(q);
    });
  };

  // turn rows into valid getPOIs response
  // used as callback for makeQuery in getPOIs
  function getResponse(rawPois, params){
    var response = {};
    response.layer = params.layerName;
    if(rawPois.length === 0){
      // return error if no pois are in range
        response.hotspots = [];
        response.errorCode = 20;
        response.errorString = "No POI in range.";
    }
    // get hotspots from filtered rows
    var hotspots = formatHotspots(rawPois);
    // format response
    response.hotspots = hotspots;
    // TODO: Support rest of response api.
    // https://www.layar.com/documentation/browser/api/getpois-response/
    response.errorCode = 0;
    response.errorString = "ok";
    return response;
  };

  function formatAnimations(anims){
    // format animation array into dict
    var animations = {
      onCreate : [],
      onUpdate : [],
      onDelete : [],
      onFocus : [],
      onClick : []
    };
    anims.forEach(function(anim){
      var animObj = {
        type : anim.type,
        length : anim.length,
        delay : anim.delay,
        interpolationParam : anim.interpolationParam,
        interpolation : anim.interpolation,
        persist : anim.persist,
        repeat : anim.repeat,
        from : anim.from,
        to : anim.to,
        axis : { x: anim.axis_x, y: anim.axis_y, z: anim.axis_z}
      };
      if(anim.event === 'onCreate'){
        animations.onCreate.push(animObj);
      } else if(anim.event === 'onUpdate'){
        animations.onUpdate.push(animObj);
      } else if(anim.event === 'onDelete'){
        animations.onDelete.push(animObj);
      } else if(anim.event === 'onFocus'){
        animations.onFocus.push(animObj);
      } else if(anim.event === 'onClick'){
        animations.onClick.push(animObj);
      } else {
        console.error("Invalid animation event type: " + anim.event);
      }
    });
    return animations;
  };

  function formatHotspots(rawPois){
    // format rows into hotspots object spec
    // TODO: Format according to complete spec
    // https://www.layar.com/documentation/browser/
    // archived/getpois-response/hotspots/
    var hotspots = [];
    rawPois.forEach(function(rawpoi, index, array){
      var poi = {};
      // top level properties
      poi.id = rawpoi.id;
      if(rawpoi.imageURL) poi.imageURL = rawpoi.imageURL;
      if(rawpoi.title || rawpoi.description || rawpoi.footnote){
        poi.text = {title: '', description: '', footnote: ''};
        poi.text.title = rawpoi.title;
        poi.text.description = rawpoi.description;
        poi.text.footnote = rawpoi.footnote;
      }
      if(rawpoi.hasOwnProperty("showSmallBiw") && rawpoi.showSmallBiw !== null)
        poi.showSmallBiw = rawpoi.showSmallBiw;
      if(rawpoi.hasOwnProperty("showBiwOnClick") && rawpoi.showBiwOnClick !== null)
        poi.showBiwOnClick = rawpoi.showBiwOnClick;
      if(rawpoi.biwStyle) poi.biwStyle = rawpoi.biwStyle;
      if(rawpoi.icon_url || rawpoi.icon_type){
        poi.icon = {url: rawpoi.icon_url, type: rawpoi.icon_type};
      }
      if(rawpoi.hasOwnProperty("inFocus") && rawpoi.inFocus !== null)
        poi.inFocus = rawpoi.inFocus;

      // format anchor
      if(rawpoi.anchor.lat && rawpoi.anchor.lon){
          poi.anchor = {geolocation : {lat: null, lon:null}};
          poi.anchor.geolocation.lat = rawpoi.anchor.lat;
          poi.anchor.geolocation.lon = rawpoi.anchor.lon;
      } else if(rawpoi.anchor.referenceImage){
        poi.anchor = {referenceImage : rawpoi.anchor.referenceImage};
      } else if (rawpoi.anchor.geolocation){
        poi.anchor = {geolocation: rawpoi.anchor.geolocation}
      } else if (rawpoi.anchor.poi){
        poi.anchor = {poi: rawpoi.anchor.poi};
      } else {
        console.error("Bad anchor format!");
        return [];
      }
      // format actions
      if(rawpoi.actions && rawpoi.actions.length > 0){
        poi.actions = rawpoi.actions;
      } else {
        // poi.actions = [];
      }
      // format animations
      if(rawpoi.animations&& rawpoi.animations.length > 0){
        poi.animations = formatAnimations(rawpoi.animations);
      } else {
        // poi.animations = {};
      }
      // format object
      if(rawpoi.object){
        // TODO: support full object api rather than just mandatory fields
        poi.object = rawpoi.object;
      } else {
        // poi.object = {};
      }
      // format transform
      if(rawpoi.transform){
        poi.transform = {
          rotate : {
            rel : rawpoi.transform.rel,
            axis : { x: rawpoi.transform.rotate_x,
                     y: rawpoi.transform.rotate_y,
                     z: rawpoi.transform.rotate_z },
            angle : rawpoi.transform.angle
          },
          translate : { x: rawpoi.transform.translate_x,
                        y: rawpoi.transform.translate_y,
                        z: rawpoi.transform.translate_z }
        };
        if(rawpoi.transform.scale !== null){
          poi.transform.scale = rawpoi.transform.scale;
        } else {
          poi.transform.scale = { x: rawpoi.transform.scale_x,
                                  y: rawpoi.transform.scale_y,
                                  z: rawpoi.transform.scale_z };
        }
      } else {
        // poi.transform = {};
      }
      // push formatted poi to the hotspots array;
      hotspots.push(poi);
    });
    return hotspots;
  };

  function distanceFilter(poi, params){
    var lat = params.lat,
    lon = params.lon,
    radius = params.radius;
    return geolib.getDistance(
      {latitude: lat, longitude: lon},
      {latitude: poi.anchor.lat, longitude: poi.anchor.lon}
    ) <= radius ? true : false;
  };

  function applyAnchors(pois, anchors){
    // map anchors to the appropriate pois
    return pois.map(function(poi, index, array){
      _.assign(poi.anchor, _.find(anchors, function(ancr){
        return ancr.id === poi.anchorID}));
      return poi;
    });
  };

  function filterPOIs(pois, params){
    // filter rows with appropriate strategies depending on what is inside their
    // anchors
    // console.log("filter pois");
    var params = params;
    function filterPOI(poi, pois){
        if(poi.anchor.referenceImage !== null){
          // filter according to referenceImage param
          if(params.recognizedReferenceImage){
            return poi.anchor.referenceImage === params.recognizedReferenceImage
                   ? true : false;
          } else {
            return false;
          }
        } else if(poi.anchor.lat !== null && poi.anchor.lon !== null) {
          // filter according to distance to user
          if(params.lat && params.lon){
              return distanceFilter(poi, params);
          } else {
            return false;
          }
        } else if(poi.anchor.geolocation === "user"){
          // pass these through, because they are always on top of the user
          return true;
        } else if(poi.anchor.poi !== null){
          // recursively filter according to that poi's anchor
          var poi = _.find(pois, function(anchorpoi){
            return anchorpoi.id === poi.anchor.poi});
          return filterPOI(poi);
        } else {
          return false;
        }
    };
    return pois.filter(function(poi, index, pois){return filterPOI(poi, pois)});
  };



  function connectToDB(){
    var conn = mysql.createConnection(config);
    // the every method invoked on the connection object is queued and executed
    // in sequence.
    conn.connect(function(err){
      if(err) {
        console.error('error connecting: ' + err.stack);
        return;
      }
      // console.log('connected to db as id: ' + conn.threadId);
    });
    return conn;
  };

  function disconnectFromDB(){
    if(conn.threadId){
      conn.end(function(err){
        if(err){
          console.error('error disconnecting: ' + err.stack);
          return;
        }
        // console.log('disconnected from db');
      });
    }
    conn = null;
    return conn;
  }

  function handleMysqlErr(error, callback){
    if(error.fatal){
      // SHUT DOWN EVERYTHING
      console.error("Fatal db error!: " + error.code);
      // Throw error that should propagate up to the getPOIs try-catch
      // throw error;
    } else {
      console.error("Non-fatal db error: " + error.code);
      // if(callback) return callback(error);
      // return;
    }
    throw error;
  }

  function getErrorResponse(err, query){
    // format an error response json depending on situation.
    var response = {};
    if(query.hasOwnProperty("layerName")){
      response.layer = query.layerName;
    } else {
      response.layer = ""
    }
    response.hotspots = [];
    response.errorCode = 20;
    if(err.code){
      // if this is a propagated mysql error
      response.errorString = "MySQL error: " + err.code;
    } else {
      // generic error
      response.errorString = err.message;
    }
    return response;
  }

  return {
    getConfig : getConfig,
    setConfig : setConfig,
    getPOIs : getPOIs,
    connectToDB : connectToDB,
    disconnectFromDB : disconnectFromDB
  };

};

module.exports = nayar();
