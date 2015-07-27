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
  config = _.defaults(config, defaultConfig);
  function getGeoPOIs(query, cb) {
    // connect to db
    var conxn = connectToDB(config);
    // make database query
    makeQuery(conxn, query, function(rows, params){
      // get and return response json
      var resjson = getResponse(rows, params);
      return cb(resjson);
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
  function makeQuery(conxn, params, cb){
    // get all geo POIs mandatory response data
    var qstr = 'SELECT id, imageURL, description, footnote, lat, lon';
    qstr = qstr+' FROM POI WHERE poiType = "geo" LIMIT 0, 50;';
    conxn.query(qstr, function (err, rows, fields){
      if(err) throw err;
      return cb(rows, params);
    });
  };

  // turn rows into valid getPOIs response
  // used as callback for makeQuery in getGeoPOIs
  function getResponse(rows, params){
    // filter by distance
    var filteredRows = distanceFilter(rows, params);
    // get hotspots from filtered rows
    var hotspots = getHotspots(filteredRows);
    // format response
    var response = {};
    response.layer = params.layerName;
    response.hotspots = hotspots;
    // return error if no hotspots in returned
    if(response.hotspots.length <= 0){
      response.errorCode = 20;
      response.errorString = "No POI in range.";
    } else {
      response.errorCode = 0;
      response.errorString = "ok";
    }
    return response;
  };

  function getHotspots(rows){
    // format rows into hotspots object spec
    // see: https://www.layar.com/documentation/browser/archived/getpois-response/hotspots/
    var hotspots = [];
    rows.forEach(function(row, index, array){
      var poi = {};
      poi.id = row.id;
      poi.imageURL = row.imageURL;
      poi.anchor = {geolocation : {lat: null, lon:null}};
      poi.anchor.geolocation.lat = row.lat;
      poi.anchor.geolocation.lon = row.lon;
      poi.text = {title: '', description: '', footnote: ''};
      poi.text.title = row.title;
      poi.text.description = row.description;
      poi.text.footnote = row.footnote;
      hotspot.push(poi);
    });
    return hotspots;
  }

  function distanceFilter(rows, params){
    var lat = params.lat,
    lon = params.lon,
    radius = params.radius;
    return rows.filter(function(val, index, array){
      return geolib.getDistance(
        {latitude: lat, longitude: lon},
        {latitude: val.lat, longitude: val.lon}
      ) <= radius ? true : false;
    });
  };

  function connectToDB(cfg){
    var conxn = mysql.createConnection(cfg);
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

  return {
    getConfig : getConfig,
    setConfig : setConfig,
    getGeoPOIs : getGeoPOIs
  };

};

module.exports = nayar();
