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
  var conxn = null;
  config = _.defaults(config, defaultConfig);

  function getPOIs(query, cb) {
    // connect to db
    if(conxn === null){
      // if no connection established, go ahead and connect
      conxn = connectToDB();
    }
    // determine if layer requested is geo or vision
    if(conxn.threadId){
      getLayer(conxn, query, function(err, layer){
        if(err){
          console.error(err.error);
          return;
        }
        // var poiType = layer.poiType;
        // make database query
        makeQuery(conxn, query, layer, function(rows, params){
          // get and return response json
          var resjson = getResponse(rows, params);
          return cb(resjson);
        });
      });
    }
  };

  function getLayer(conxn, params, cb) {
    var qstr = 'SELECT id, poiType FROM Layer WHERE layer = "';
    qstr = qstr + params.layerName+'" LIMIT 0, 1;';
    conxn.query(qstr, function (err, rows, fileds){
      if(err) throw err;
      if(rows.length > 0){
        return cb({error: "no layers found with that layer name"}, null);
      } else {
        // should only find one layer, so just return the first
        return cb(null, rows[0]);
      }
    });
  };

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

  // construct and async send query to database, invoke callback on response
  function makeQuery(conxn, params, layer, cb){
    var poiType = layer.poiType;
    var layerID = layer.id;
    // mandatory fields
    var qstr = 'SELECT id, ';
    // type-specific fields
    if(poiType === "geo"){
      qstr += 'title, description, footnote, imageURL, anchorID, showSmallBiw, ';
      qstr += 'showSmallBiw, showBiwOnClick, biwStyle, icon_url, icon_type, inFocus ';
      qstr += 'FROM Poi WHERE poiType = "geo", layerID = '+layerID+' LIMIT 0, 50;';
    } else if (poiType === "vision"){
      qstr += 'referenceImage, anchorID, objectID, transformID, animationID ';
      qstr += 'FROM Poi WHERE poiType = "vision", layerID = '+layerID+' LIMIT 0, 50';
    } else {
      return cb({error: "invalid poiType in database: only geo or vision are allowed!"}, null, null);
    }
    // make query
    conxn.query(qstr, function (err, rows, fields){
      if(err) return cb(err, null, null);
      return cb(null, rows, params);
    });
  };

  // turn rows into valid getPOIs response
  // used as callback for makeQuery in getPOIs
  function getResponse(rawRows, params){
    var response = {};
    response.layer = params.layerName;
    // get anchors for rows (need anchors so as to filter by distance)
    getAnchors(rawRows, function(err, anchors){
      // add anchors to the appropriate rows, and filter accordingly
      var rows_anchors = applyAnchors(rawRows, anchors);
      var filteredRows = distanceFilter(rows_anchors, params);
      if(filteredRows.length <= 0){
        // return error if no rows are in range
          response.hotspots = [];
          response.errorCode = 20;
          response.errorString = "No POI in range.";
      }
      // we wait until after filtering to get associated objects from the db
      // to avoid unneccessary db queries.
      getOptionalData(filteredRows, function(err, rows){
        // get hotspots from filtered rows
        var hotspots = getHotspots(rows);
        // format response
        response.hotspots = hotspots;
        // TODO: Support rest of response api. see: https://www.layar.com/documentation/browser/api/getpois-response/
        response.errorCode = 0;
        response.errorString = "ok";
        return response;
      });
    });
  };

  function getOptionalData(filteredRows, cb){
    // TODO: Refactor to avoid callback hell
      var rows = _.clone(filteredRows);
      // get actions for each row if applicable
      getActions(filteredRows, function(err, rows_actions){
        // rows_actions is an array of rows plus applicable actions array
        if(err) console.err(err.error);
        // get object per row if applicable
        getObject(rows_actions, function(err, rows_object){
          if(err) console.err(err.error);
          // get animations per row if applicable
          getAnimations(rows_object, function(err, rows_anims){
            if(err) console.err(err.error);
            // get transforms per row if applicable
            getTransforms(rows_anims, function(err, rows_transforms){
              if(err) console.err(err.error);
              cb(rows_transforms);
            });
          });
        });
      });
  };

  function getActions(pois, cb){
    pois = _.map(pois, function(poi){
      var qstr = 'SELECT label, uri, contentType, activityType, autoTrigger, ';
      qstr += 'autoTriggerOnly, params FROM Actions WHERE poiID = ' + poi.id +';';
      // use closure to ensure callback uses the right poi
      return (function(poi, qstr, ccb){
          conxn.query(qstr, function(err, actions, fields){
            if(err) throw err;
            return ccb(poi, actions);
          });
      })(poi, qstr, function(poi, actions){
        if(actions){
          poi.actions = actions;
        } else {
          poi.actions = [];
        }
        return poi;
      });
    });
    return cb(null, pois);
  };

  function getObject(pois, cb){
    pois = _.map(pois, function(poi){
      var qstr = 'SELECT contentType, url, size, FROM Object WHERE id = ';
      qstr += poi.objectID+' LIMIT 0,1;';
      return ( function(poi, qstr, ccb){
        conxn.query(qstr, function(err, obj, fields){
          if(err) throw err;
          return ccb(obj);
        });
      })(poi, qstr, function(poi, obj){
        if(obj){
          poi.object = obj;
        } else {
          poi.object = {};
        }
        return poi;
      });
    });
    return cb(null, pois);
  };

  function getTransform(pois, cb){
    pois = _.map(pois, function(poi){
      var qstr = 'SELECT rel, angle, rotate_x, rotate_y, rotate_z, translate_x, ';
      qstr += 'translate_y, translate_z, scale_x, scale_y, scale_z, scale FROM ';
      qstr += 'Transform WHERE id = '+poi.transformID+' LIMIT 0,1;';

      return ( function(poi, qstr, ccb){
        conxn.query(qstr, function(err, transform, fields){
          if(err) throw err;
          return ccb(poi, transform);
        });
      })(poi, qstr, function(poi, transform){
        if(transform){
          poi.transform = transform;
        } else {
          poi.transform = {};
        }
        return poi;
      });
    });
    return cb(null, pois);
  };

  function getAnimations(pois, cb){
    pois = _.map(pois, function(poi){
      var qstr = 'SELECT id, event, type, length, delay, interpolation, ';
      qstr += 'interpolationParam, persist, repeat, from, to, axis_x, axis_y, ';
      qstr += 'axis_z WHERE poiID = '+poi.id+';';
      return (function (poi, qstr, ccb){
        conxn.query(qstr, function(err, animations, fields){
          if(err) throw err;
          return ccb(poi, animations);
        });
      })(poi, qstr, function(poi, anims){
          if(anims.length){
            // format animation array into dict
            poi.animations = {
              onCreate : [],
              onUpdate : [],
              onDelete : [],
              onFocus : [],
              onClick : []
            };
            _.forEach(anims, function(anim){
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
                  poi.animations.onCreate.push(animObj);
              } else if(anim.event === 'onUpdate'){
                poi.animations.onUpdate.push(animObj);
              } else if(anim.event === 'onDelete'){
                poi.animations.onDelete.push(animObj);
              } else if(anim.event === 'onFocus'){
                poi.animations.onFocus.push(animObj);
              } else if(anim.event === 'onClick'){
                poi.animations.onClick.push(animObj);
              } else {
                console.error("Invalid animation event type!");
              }
            });
          } else {
            poi.animations = null;
          }
          return poi;
      });
    });
    return cb(null, pois);
  };

  function getHotspots(rows){
    // format rows into hotspots object spec
    // TODO: Format according to complete spec
    // see: https://www.layar.com/documentation/browser/archived/getpois-response/hotspots/
    var hotspots = [];
    rows.forEach(function(row, index, array){
      var poi = {};
      // top level properties
      poi.id = row.id;
      if(row.imageURL) poi.imageURL = row.imageURL;
      if(row.title || row.description || row.footnote){
        poi.text = {title: '', description: '', footnote: ''};
        poi.text.title = row.title;
        poi.text.description = row.description;
        poi.text.footnote = row.footnote;
      }
      if(row.showSmallBiw !== null) poi.showSmallBiw = row.showSmallBiw;
      if(row.showBiwOnClick !== null) poi.showBiwOnClick = row.showBiwOnClick;
      if(row.biwStyle) poi.biwStyle = row.biwStyle;
      if(row.icon_url || row.icon_type){
        poi.icon = {url: row.icon_url, type: row.icon_type};
      }
      if(row.inFocus !== null) poi.inFocus = row.inFocus;

      // format anchor
      if(row.anchor.lat && row.anchor.lon){
          poi.anchor = {geolocation : {lat: null, lon:null}};
          poi.anchor.geolocation.lat = row.anchor.lat;
          poi.anchor.geolocation.lon = row.anchor.lon;
      } else if (row.anchor.geolocation){
        poi.anchor = {geolocation: row.anchor.geolocation}
      } else if (row.anchor.poi){
        poi.anchor = {poi: row.anchor.poi};
      } else {
        console.error("Bad anchor format!");
        return [];
      }
      // format actions
      if(row.actions !== null && row.actions.length > 0){
        poi.actions = row.actions;
      }
      // format animations
      if(row.animations != null){
        poi.animations = row.animations;
      }
      // format object
      if(row.object !== null){
        // TODO: support full object api rather than just mandatory fields
        poi.object = row.object;
      }

      // format transform
      if(row.transform !== null){
        poi.transform = {
          rotate : {
            rel : row.transform.rel,
            axis : { x: row.transform.rotate_x, y: row.transform.rotate_y, z: row.transform.rotate_z},
            angle : row.transform.angle
          },
          translate : {x: row.transform.translate_x, y: row.transform.translate_y, z: row.transform.translate_z},
        };
        if(row.transform.scale !== null){
          poi.transform.scale = row.transform.scale;
        } else {
          poi.transform.scale = {x: row.transform.scale_x, y: row.transform.scale_y, z: row.transform.scale_z};
        }
      }
      // push formatted poi to the hotspots array;
      hotspots.push(poi);
    });
    return hotspots;
  }

  function distanceFilter(row, params){
    var lat = params.lat,
    lon = params.lon,
    radius = params.radius;
    return geolib.getDistance(
      {latitude: lat, longitude: lon},
      {latitude: row.anchor.lat, longitude: row.anchor.lon}
    ) <= radius ? true : false;
  };

  function applyAnchors(pois, anchors){
    // map anchors to the appropriate pois
    return pois.map(function(poi, index, array){
      _.assign(poi.anchor, _.find(anchors, function(ancr){return ancr.id === poi.anchorID}));
      return poi;
    });
  };

  function filterRows(rows, params){
    // filter rows with appropriate strategies depending on what is inside their
    // anchors
    return rows.filter(filterRow(row, params));
  }

  function filterRow(row, params){
    if(row.anchor.referenceImage !== null){
      // filter according to referenceImage param
      if(params.recognizedReferenceImage){
        return row.anchor.referenceImage === params.recognizedReferenceImage ? true : false;
      } else {
        return false;
      }
    } else if(row.anchor.lat !== null && row.anchor.lon !== null) {
      // filter according to distance to user
      if(params.lat && params.lon){
          return distanceFilter(row, params);
      } else {
        return false;
      }
    } else if(row.anchor.geolocation === "user"){
      // pass these through, because they are always on top of the user
      return true;
    } else if(row.anchor.poi !== null){
      // recursively filter according to that poi's anchor
      var poi = _.find(rows, function(anchorpoi){return anchorpoi.id === row.anchor.poi});
      return filterRow(poi, params);
    } else {
      return false;
    }
  };

  function connectToDB(){
    var conxn = mysql.createConnection(config);
    // the every method invoked on the connection object is queued and executed
    // in sequence.
    conxn.connect(function(err){
      if(err) {
        console.error('error connecting: ' + err.stack);
        return;
      }
      console.log('connected to db as id: ' + conxn.threadId);
    });
    return conxn;
  };

  function disconnectFromDB(){
    if(conxn.threadId){
      conxn.end(function(err){
        if(err){
          console.error('error disconnecting: ' + err.stack);
          return;
        }
        console.log('disconnected from db');
      });
    }
    return conxn;
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
