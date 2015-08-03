'use strict';
var nayar = require('../lib/nayar.js');
var geo_query = {};
var geo_response = {};
var vision_query = {};
var vision_response = {};
var invalid_query = {};
var invalid_response = {};
var defaultConfig = {};
var customConfig = {};
/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports['config'] = {
  setUp : function(done) {
    defaultConfig = {
      host : 'localhost',
      user : 'user',
      password : 'pass'
    };
    customConfig = {
      host : '127.0.0.1',
      user : 'root',
      password : '',
      port : 3306,
      database : 'nayar_test'
    };
    done();
  },
  'no args' : function(test) {
    test.expect(3);
    // tests here
    test.deepEqual(nayar.getConfig(), defaultConfig, 'should have default config');

    nayar.setConfig(customConfig);
    test.deepEqual(nayar.getConfig(), customConfig, 'config should be customizable');

    nayar.setConfig();
    test.deepEqual(nayar.getConfig(), defaultConfig, 'setting config with no args should set to default');
    test.done();
  }
};

exports['getPOIs'] = {
  setUp: function(done) {
    // setup here
    // invalid test parameters
    invalid_query = {
      lang : "en",
      countryCode : "US",
      lat : 40.692842,
      lon : -73.931183,
      userId : "ed48067cda8e1b985dbb8ff3653a2da4fd490a37",
      radius : 250,
      // no layerName parameter!
      version : "6.0",
      action : "refresh",
      accuracy : 100
    };
    invalid_response = {
      layer : "",
      hotspots : [],
      errorCode : 20,
      errorString : "invalid request"
    };
    // geo test parameters
    geo_query = {
      lang : "en",
      countryCode : "US",
      lat : 40.692842,
      lon : -73.931183,
      userId : "ed48067cda8e1b985dbb8ff3653a2da4fd490a37",
      radius : 250,
      layerName : "geotest",
      version : "6.0",
      action : "refresh",
      accuracy : 100
    };
    geo_response = {
      "hotspots": [{
        "id": "geo_test",
        "anchor": { "geolocation": { "lat": 40.692842, "lon": -73.931183 } },
        "text": {
          "title": "nayartest",
          "description": "testing nayar",
          "footnote": "author: thomasrstorey" },
          "imageURL": "http:\/\/trstorey.sysreturn.net\/lib\/img\/bioav.png"
        }],
        "layer": "geotest",
        "errorString": "ok",
        "errorCode": 0
    };
    // vision test parameters
    vision_query = {
      lang : "en",
      countryCode : "US",
      recognizedReferenceImage : 'menu',
      userId : "ed48067cda8e1b985dbb8ff3653a2da4fd490a37",
      radius : 250,
      layerName : "visiontest",
      version : "6.0",
      action : "refresh",
      lat : 40.692842,
      lon : -73.931183,
      accuracy : 100
    };
    vision_response = {
      "hotspots": [{
        "id": "vision_test",
        "anchor": { "referenceImage": "menu" },
        "animations" : {
          "onCreate" : [{
              "type" : "translate",
              "length" : 3000,
              "delay" : 0,
              "interpolation" : "linear",
              "interpolationParam" : null,
              "persist" : 0,
              "repeat" : 0,
              "from" : 1.0,
              "to" : 0.0,
              "axis" : {"x": -0.10, "y": 0.0, "z": 0.0}
          }],
          "onUpdate" : [],
          "onDelete" : [],
          "onFocus" : [{
            "type" : "scale",
            "length" : 2000,
            "delay" : 3000,
            "interpolation" : "bounce",
            "interpolationParam" : 1.0,
            "persist" : 0,
            "repeat" : 1,
            "from" : 0.2,
            "to" : 1.0,
            "axis" : {"x": 1.0, "y": 1.0, "z": 1.0}
          }],
          "onClick" : [{
            "type" : "rotate",
            "length" : 1000,
            "delay" : 0,
            "interpolation" : "linear",
            "interpolationParam" : null,
            "persist" : 1,
            "repeat" : 1,
            "from" : 0.0,
            "to" : 360.0,
            "axis" : {"x": 0.0, "y": 0.0, "z": 1.0}
          },{
            "type" : "translate",
            "length" : 2000,
            "delay" : 0,
            "interpolation" : "accelerateDecelerate",
            "interpolationParam" : null,
            "persist" : 1,
            "repeat" : 0,
            "from" : 0.0,
            "to" : 1.0,
            "axis" : {"x": -0.08, "y": 0.08, "z": 0.0}
          }]
        },
        "object" : {
          "contentType" : "model/vnd.layar.l3d",
          "url" : "http://maomao.fixedpoint.nl/temp/layar_l3d/music.l3d",
          "size" : 0.5
        }
        }],
        "layer": "visiontest",
        "errorString": "ok",
        "errorCode": 0
    };
    // config for database -- depends on environment where test is running
    customConfig = {
      host : '127.0.0.1',
      user : 'root',
      password : '',
      port : 3306,
      database : 'nayar_test'
    };
    done();
  },
  'invalid': function(test) {
    test.expect(1);
    nayar.setConfig(customConfig);
    nayar.getPOIs(invalid_query, function(json){
      test.deepEqual(json, invalid_response, 'should give a valid error JSON if GET query is invalid');
      test.done();
    });
  },
  'geo': function(test) {
    test.expect(1);
    // tests here
    nayar.setConfig(customConfig);
    nayar.getPOIs(geo_query, function(json){
      test.deepEqual(json, geo_response, 'should produce JSON that matches Layar getPOIs response spec');
      test.done();
    });
  },
  'vision': function(test) {
    test.expect(1);
    nayar.setConfig(customConfig);
    nayar.getPOIs(vision_query, function(json){
      test.deepEqual(json, vision_response, 'should produce JSON that matches Layar getPOIs response spec')
      test.done();
    });
  }
};
