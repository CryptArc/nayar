/*
 * nayar
 * https://github.com/thomasrstorey/nayar
 *
 * Copyright (c) 2015 thomasrstorey
 * Licensed under the MIT license.
 */

'use strict';

var nayar = function(){

  var _ = require('lodash');
  var geolib = require('geolib');
  var jsf = require('jsonfile');
  var path = require('path');

  var self = {};

  self.config = jsf.readFileSync(path.join(__dirname, './config.json'));
  var handler = null;

  /**
  * Get a copy of the current configuration state.
  *
  * @return   object    configuration object
  */

  self.getConfig = function (){
    return _.clone(self.config);
  }

  /**
  * Retrieve getPOIs response data, formatted as a json object according to
  * Layar API.
  *
  * @param    object    Layar getPOIs request query parameters
  * @param    object    callback function, receives response json as argument
  * @return   undefined
  */

  self.getResponse = function (query, cb) {
    // validate query
    if(!validate(query)){
      return cb(getErrorResponse(new Error("invalid request"),query));
    }
    // get handler
    if(!handler){
      console.log("get new handler");
      handler = getHandler(self.config);
    }
    try{
      console.log("try to get response");
      handler.init(function(err, results){
        console.log("init suceeded, get the layer");
        console.log(err);
        handler.get({
          table : "Layer",
          where : {layer : query.layerName},
          limit : [0, 1]
        }, function getLayerPOIs (err, layer){
          console.log("got the layer, now get the POIs");
          console.log(err);
          layer = layer[0];
          handler.get({
            table : "Poi",
            where : {layerID : layer.id}
          }, function processPOIs (err, pois){
            console.log("got the POIs, now process them");
            console.log(err);
            if(!pois.length) console.log("no pois found!");
            pois = filterPOIs(pois, query);
            console.log("POIs successfully filtered");
            getPOIsData(pois, query, function(filledPois){
              console.log("get POIs data, generate response");
              if(handler !== null){
                console.log("disconnect handler");
                handler.disconnect();
              }
              var resjson = formatResponse(filledPois, query);
              console.log("response generated");
              console.log("send response json");
              return cb(null, resjson);
            });
          });
        });
      });
    } catch (e){
      return cb(getErrorResponse(e, query));
    }
  };

  function getHandler(config){
    if(config.database_type === "mysql"){
      var dbhandler = require('./mysqlhandler.js');
    } else if(config.database_type === "mongodb"){
      // TODO
    } else if(config.database_type === "json"){
      // TODO
    }
    return dbhandler;
  }

  function validate(q){
    // list of all required request parameters
    // up to date for Layar API version 8.4
    var params = ["userId",
              "layerName",
              "version",
              "lat",
              "lon",
              "countryCode",
              "lang"];
    // true if q has a key for each param item p
    return _.every(params, function(p){return _.has(q, p)});
  }

  // construct and async send query to database, invoke callback on response
  function getPOIsData(pois, query, cb){
    var numPois = pois.length;
    var out = [];
    if (!pois.length) {
      return cb(out);
    }
    pois.forEach(function (poi, index){
      // IIFE to close over poi in getPOIData callback
      (function (poi) {
        getPOIData(poi, function (results){
          if(results["Object"].length){
            poi.object = results.Object[0];
          }
          if(results["Transform"].length){
            poi.transform = results.Transform[0];
          }
          if(results["Action"].length){
            poi.actions = results.Action;
          }
          if(results["Animation"].length){
            poi.animations = results.Animation;
          }
          out.push(poi);
          if(out.length === numPois){
            return cb(out);
          }
        });
      })(poi);

    });
  };

  function getPOIData(poi, cb){
    var results = { "Transform" : null,
                    "Action" : null,
                    "Animation" : null,
                    "Object" : null };
    var keys = Object.keys(results);
    var numKeys = keys.length;
    keys.forEach(function (key, index){
      var where = {};
      if(key === "Animation" || key === "Action"){
        where = {poiID : poi.id};
      } else if(key === "Transform") {
        where = {id : poi.transformID};
      } else if(key === "Object"){
        where = {id : poi.objectID};
      }
      // IIFE to close over key in handler.get callback
      (function (key) {
        handler.get({
        table : key,
        where : where
       }, function (err, data){
         if(data !== undefined){
           results[key] = data;
         } else {
           results[key] = [];
         }
         if(_.every(results, function(k){ return k !== null })){
           return cb(results);
         }
       });
      })(key);

    });
  }

  // turn rows into valid getPOIs response
  // used as callback for makeQuery in getPOIs
  function formatResponse(rawPois, params){
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
        persist : anim.persist ? true : false,
        repeat : anim.repeat ? true : false,
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
      if(rawpoi.hasOwnProperty("showSmallBiw")
        && rawpoi.showSmallBiw !== null)
        poi.showSmallBiw = rawpoi.showSmallBiw ? true : false;
      if(rawpoi.hasOwnProperty("showBiwOnClick")
        && rawpoi.showBiwOnClick !== null)
        poi.showBiwOnClick = rawpoi.showBiwOnClick ? true : false;
      if(rawpoi.biwStyle) poi.biwStyle = rawpoi.biwStyle;
      if(rawpoi.icon_url || rawpoi.icon_type){
        poi.icon = {url: rawpoi.icon_url, type: rawpoi.icon_type};
      }
      if(rawpoi.hasOwnProperty("inFocus") && rawpoi.inFocus !== null)
        poi.inFocus = rawpoi.inFocus ? true : false;

      // format anchor
      if(rawpoi.lat && rawpoi.lon){
          poi.anchor = {geolocation : {lat: null, lon:null}};
          poi.anchor.geolocation.lat = rawpoi.lat;
          poi.anchor.geolocation.lon = rawpoi.lon;
      } else if(rawpoi.referenceImage){
        poi.anchor = {referenceImage : rawpoi.referenceImage};
      } else if (rawpoi.geolocation){
        poi.anchor = {geolocation: rawpoi.geolocation}
      } else if (rawpoi.poi){
        poi.anchor = {poi: rawpoi.poi};
      } else {
        console.error("Bad anchor format!");
        return [];
      }
      // format actions
      if(rawpoi.actions && rawpoi.actions.length > 0){
        var actions = rawpoi.actions.map(function(v, i){
          v.autoTrigger = v.autoTrigger ? true : false;
          v.autoTriggerOnly = v.autoTriggerOnly ? true : false;
          v.showActivity = v.showActivity ? true : false;
          if(v.params !== null){
            v.params = v.params.split(",");
          } else {
            v.params = [];
          }
          return _.omit(v, ['id', 'layerID', 'poiID']);
        });
        poi.actions = actions;
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
            rel : rawpoi.transform.rel ? true : false,
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
    console.log(lat, lon, radius, poi.lat, poi.lon);
    var result = geolib.getDistance(
      {latitude: lat, longitude: lon},
      {latitude: poi.lat, longitude: poi.lon}
    ) <= radius ? true : false;
    return result;
  };

  function filterPOIs(pois, params){
    // filter rows with appropriate strategies depending on what is inside
    // their anchors
    console.log("filter time");
    var params = params;
    function filterPOI(poi, pois){
        if(_.has(poi, 'referenceImage') &&
          poi.referenceImage !== null &&
          poi.referenceImage.length){
          // filter according to referenceImage param
          if(params.recognizedReferenceImage){
            return poi.referenceImage === params.recognizedReferenceImage
                   ? true : false;
          } else {
            return false;
          }
        } else if(poi.lat !== null && poi.lon !== null) {
          console.log("filter by geo coord");
          // filter according to distance to user
          if(params.lat && params.lon){
              console.log("run distance filter");
              return distanceFilter(poi, params);
          } else {
            return false;
          }
        } else if(poi.geolocation === "user"){
          // pass these through, because they are always on top of the user
          return true;
        } else if(poi.poi !== null){
          // recursively filter according to that poi's anchor
          var poi = _.find(pois, function(anchorpoi){
            return anchorpoi.id === poi.poi});
          return filterPOI(poi);
        } else {
          return false;
        }
    };
    return pois.filter(function(poi, index, pois){
      console.dir(poi);
      return filterPOI(poi, pois);
    });
  };

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

  self.do = function (req, cb){
    if(!handler){
      handler = getHandler(self.config);
    }
      handler.init(function(err, status){
        if(!req.hasOwnProperty("table")){
          process.nextTick(cb(new Error("No table specified for insert.")));
        }
        var ins = {table : req.table};
        switch (req.action) {
          case "set":
            ins.columns = _.omit(req, ['table', 'action']);
            handler.set(ins, function(err, result){
              if(handler !== null){
                handler.disconnect();
              }
              // handler = null;
              cb(err, result);
            });
            break;
          case "update":
            ins.where = {id : req.id};
            ins.columns = _.omit(req, ['table', 'action', 'id']);
            handler.set(ins, function(err, result){
              if(handler !== null){
                handler.disconnect();
              }
              // handler = null;
              cb(err, result);
            });
            break;
          case "get":
            ins.where = _.omit(req, ['table', 'action']);
            if(_.keys(ins.where).length === 0){
              ins.where = null;
            }
            handler.get(ins, function(err, result){
              if(handler !== null){
                handler.disconnect();
              }
              // handler = null;
              cb(err, result);
            });
            break;
          case "delete":
            ins.where = _.omit(req, ['table', 'action']);
            handler.delete(ins, function(err, result){
              if(handler !== null){
                handler.disconnect();
              }
              // handler = null;
              cb(err, result);
            });
            break;
          default:
            process.nextTick(cb(new Error("Request not recognized.")));
        }
    });

  };

  self.close = function () {
    console.log("close");
    if(handler && handler.close){
      handler.close(function(status){
        if(status){
          console.log("mysql connection did not close.");
          return;
        } else {
          return;
        }
      });
    } else {
      process.nextTick(function(){
        return;
      });
    }
  };

  return self;

};

module.exports = nayar();
