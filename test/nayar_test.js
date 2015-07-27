'use strict';

var nayar = require('../lib/nayar.js');
var query = {};
var expectedResponse = {};
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

    test.setConfig();
    test.deepEqual(nayar.getConfig(), defaultConfig, 'setting config with no args should set to default');
  }
};

exports['getGeoPOIs'] = {
  setUp: function(done) {
    // setup here
    // http://devAPI.example.com/getPOIs/?countryCode=IN&lon=4.887339 &userId=ed
    // 48067cda8e1b985dbb8ff3653a2da4fd490a37 &radius=6245&lat=52.377544&layerNa
    // me=snowy4&accuracy=100
    query = {
      lang : "en",
      countryCode : "US",
      lat : 40.692842,
      lon : -73.931183,
      userId : "ed48067cda8e1b985dbb8ff3653a2da4fd490a37",
      radius : 250,
      layerName : "nayartest",
      version : "6.0",
      action : "refresh",
      accuracy : 100
    };
    expectedResponse = {
      "hotspots": [{
        "id": "geo_test_1",
        "anchor": { "geolocation": { "lat": 40.692842, "lon": -73.931183 } },
        "text": {
          "title": "nayar test",
          "description": "nayar testing",
          "footnote": "test for nayar" },
          "imageURL": "http:\/\/trstorey.sysreturn.net\/lib\/img\/bioav.png"
        }],
        "layer": "nayartest",
        "errorString": "ok",
        "errorCode": 0
    };
    customConfig = {
      host : '127.0.0.1',
      user : 'travis',
      password : '',
      port : 3306,
      database : 'nayar_test'
    };
    done();
  },
  'no args': function(test) {
    test.expect(1);
    // tests here
    nayar.setConfig(customConfig);
    test.deepEqual(nayar.getGeoPOIs(query), expectedResponse, 'should get GeoPOIs from the mysql database and format according to response specification');
    test.done();
  },
};
