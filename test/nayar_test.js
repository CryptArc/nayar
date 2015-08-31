'use strict';
var nayar = require('../lib/nayar.js');
var mysqlhandler = require('../lib/mysqlhandler.js');
var geo_query = {};
var geo_response = {};
var vision_query = {};
var vision_response = {};
var invalid_query = {};
var invalid_response = {};

var bedonetimer = null;

process.on('uncaughtException', function(err) {
  console.error(err.stack);
});

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

exports['mysqlFormatting'] = {
  setUp: function(done){
    done();
  },
  select : function(test){
    test.expect(1);
    var req = {
      table : "Layer",
      where : {layer : "testlayer"},
      limit : [0, 1]
    };
    var q = "SELECT * FROM `Layer` WHERE `layer` = \'testlayer\' LIMIT 0, 1;";
    test.equal(mysqlhandler.formatSelect(req), q, "formatSelect should return valid mysql query string");
    test.done();
  },
  select_multi_condition : function(test){
    test.expect(1);
    var req = {
      table : "Layer",
      where : {layer : "testlayer", poiType : "vision"},
      limit : [0, 1]
    };
    var q = "SELECT * FROM `Layer` WHERE `layer` = \'testlayer\', `poiType` = \'vision\' LIMIT 0, 1;";
    test.equal(mysqlhandler.formatSelect(req), q, "formatSelect should return valid mysql query string");
    test.done();
  },
  insert : function(test){
    test.expect(1);
    var req = {
      table : "Object",
      columns : {contentType: "model/vnd.layar.l3d",
                 url: "http://example.com/example_full.l3d",
                 size: 2,
                 previewImage: "http://example.com/example_full.jpg"}
    };
    var q = "INSERT INTO `Object` SET `contentType` = \'model/vnd.layar.l3d\', "
    +"`url` = \'http://example.com/example_full.l3d\', `size` = 2, `previewImage"
    +"` = \'http://example.com/example_full.jpg\' ;";
    test.equal(mysqlhandler.formatInsert(req), q, "formatSelect should return valid mysql query string");
    test.done();
  },
  update : function(test){
    test.expect(1);
    var req = {
      table : "Object",
      columns : {contentType: "model/vnd.layar.l3d",
                 url: "http://example.com/example_full.l3d",
                 size: 2,
                 previewImage: "http://example.com/example_full.jpg"},
      where : {id: 15}
    };
    var q = "UPDATE `Object` SET `contentType` = \'model/vnd.layar.l3d\', "
    +"`url` = \'http://example.com/example_full.l3d\', `size` = 2, `previewImage"
    +"` = \'http://example.com/example_full.jpg\' WHERE `id` = 15 ;";
    test.equal(mysqlhandler.formatUpdate(req), q, "formatSelect should return valid mysql query string");
    test.done();
  },
  delete : function(test){
    test.expect(1);
    var req = {
      table : "Object",
      where : {id: 15}
    };
    var q = "DELETE FROM `Object` WHERE `id` = 15 ;";
    test.equal(mysqlhandler.formatDelete(req), q, "formatSelect should return valid mysql query string");
    test.done();
  },
  create_table : function(test){
    test.expect(1);
    var table = {
        "name": "Object",
        "columns": {
            "id": {
                "type": "int",
                "length": "11",
                "value": null,
                "options": "NOT NULL AUTO_INCREMENT PRIMARY KEY"
            },
            "contentType": {
                "type": "varchar",
                "length": "255",
                "value": null,
                "options": "NOT NULL"
            },
            "url": {
                "type": "varchar",
                "length": "255",
                "value": null,
                "options": "NOT NULL"
            },
            "size": {
                "type": "float",
                "length": "15,5",
                "value": null,
                "options": "NOT NULL"
            },
            "previewImage": {
                "type": "varchar",
                "length": "255",
                "value": null,
                "options": "DEFAULT NULL"
            }
        }
    }
    var q = "CREATE TABLE IF NOT EXISTS `Object` ("
      +"`id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY, "
      +"`contentType` varchar(255) NOT NULL, "
      +"`url` varchar(255) NOT NULL, "
      +"`size` float(15,5) NOT NULL, "
      +"`previewImage` varchar(255) DEFAULT NULL "
      +") DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;";
    test.equal(mysqlhandler.formatCreate(table), q, "formatSelect should return valid mysql query string");
    test.done();
  }
}

exports['mysqlHandling'] = {
  init : function (test) {
    test.expect(8);
    mysqlhandler.init(function(err, results){
      test.equal(results.length, 7, "init should create databases if they don't already exist");
      results.forEach(function(result){
        test.equal(result.changedRows, 0, "init should create databases if they don't already exist");
      });
      test.done();
      //
    });
  },
  set_insert : function (test) {
    test.expect(1);
    var req = {
      table : "Object",
      columns : {contentType: "model/vnd.layar.l3d",
                 url: "http://example.com/example_full.l3d",
                 size: 2,
                 previewImage: "http://example.com/example_full.jpg"}
    };
    mysqlhandler.init(function(err, results){
      mysqlhandler.set(req, function (err, response){
        test.equal(response.affectedRows, 1, "set should insert rows into tables according to request");
        test.done();
      });
    });
  },
  set_update : function (test) {
    test.expect(1);
    var setreq = {
      table : "Object",
      columns : {contentType: "model/vnd.layar.l3d",
                 url: "http://example.com/example_full.l3d",
                 size: 2,
                 previewImage: "http://example.com/example_full.jpg"}
    };
    var updreq = {
      table : "Object",
      columns : {size: 3},
      where : {id : 2}
    };
    mysqlhandler.init(function(err, results){
      mysqlhandler.set(setreq, function (err, sresponse){
        mysqlhandler.set(updreq, function (err, uresponse){
          test.equal(uresponse.changedRows, 1, "set should update rows into tables when 'where' is in request");
          test.done();
        });
      });
    });
  },
  get : function (test) {
    test.expect(1);
    var setreq = {
      table : "Object",
      columns : {contentType: "model/vnd.layar.l3d",
                 url: "http://example.com/example_full.l3d",
                 size: 2,
                 previewImage: "http://example.com/example_full.jpg"}
    };
    var getreq = {
      table : "Object",
      where : {id : 3}
    };
    var getdata = {
      id: 3,
      contentType: "model/vnd.layar.l3d",
      url: "http://example.com/example_full.l3d",
      size: 2,
      previewImage: "http://example.com/example_full.jpg"
    }
    mysqlhandler.init(function(err, results){
      mysqlhandler.set(setreq, function (err, response){
        mysqlhandler.get(getreq, function (err, data){
          test.deepEqual(data[0], getdata, "get should select rows from tables according to request");
          test.done();
        });
      });
    });
  },
  delete_row : function(test){
    test.expect(1);
    var setreq = {
      table : "Object",
      columns : {contentType: "model/vnd.layar.l3d",
                 url: "http://example.com/example_full.l3d",
                 size: 2,
                 previewImage: "http://example.com/example_full.jpg"}
    };
    var delreq = {
      table : "Object",
      where : {id : 4}
    };
    mysqlhandler.init(function(err, results){
      mysqlhandler.set(setreq, function (err, response){
        mysqlhandler.delete(delreq, function (err, data){
          test.equal(data.affectedRows, 1, "delete should delete rows according to request");
          test.done();
        });
      });
    });
  },
  tearDown : function (done) {
    mysqlhandler.disconnect();
    done();
  }
}
/*
TODO: Need to figure out how to insert through nayar API and test that before we
      can test the response API.
*/

exports['nayar'] = {
  setUp: function(done) {
    done();
  },
  set_get: function(test) {
    test.expect(2);
    var laysetreq = {table: "Layer",
                  action: "set",
                  layer: "testlayer1",
                  poiType: "vision"};
    var laygetreq = {table: "Layer",
                  action: "get",
                  id: null};
    nayar.do(laysetreq, function(err, result){
      laygetreq.id = result.insertId;
      test.equal(result.affectedRows, 1, "'do' should be able to insert");
      nayar.do(laygetreq, function(err, data){
        test.equal(data[0].layer, "testlayer1", "'do' should be able to get inserted data");
        test.done();
      });
    });
  },
  set_update_get: function(test) {
    test.expect(5);
    var laysetreq = {table: "Layer",
                  action: "set",
                  layer: "testlayer2",
                  poiType: "vision"};
    var poireq = {table: "Poi",
                  action: "set",
                  layerID: null,
                  poiType: "vision",
                  referenceImage: "test"};
    var objreq = {table: "Object",
                  action: "set",
                  url: "http://test.test.com/test.l3d",
                  contentType: "model/vnd.layar.l3d",
                  size: 2};
    nayar.do(laysetreq, function(err, result){
      var layerid = result.insertId;
      poireq.layerID = layerid;
      test.equal(result.affectedRows, 1, "'do' should be able to insert");
      nayar.do(poireq, function(err, result2){
        var poiid = result2.insertId;
        test.equal(result2.affectedRows, 1, "'do' should be able to insert");
        nayar.do(objreq, function(err, result3){
          var objid = result3.insertId;
          test.equal(result3.affectedRows, 1, "'do' should be able to insert");
          var poiupdreq = {table: "Poi",
                           action: "update",
                           id: poiid,
                           objectID: objid};
          nayar.do(poiupdreq, function(err, result4){
            test.equal(result4.changedRows, 1, "'do' should be able to update existing rows");
            var poigetreq = {table: "Poi",
                             action: "get",
                             id: poiid};
            nayar.do(poigetreq, function(err, data){
              test.equal(data[0].objectID, objid, "'do' should be able to get updated data");
              test.done();
            });
          });
        });
      });
    });
  },
  set_delete : function (test) {
    test.expect(2);
    var laysetreq = {table: "Layer",
                  action: "set",
                  layer: "testlayer3",
                  poiType: "vision"};
    nayar.do(laysetreq, function(err, result){
      test.equal(result.affectedRows, 1, "'do' should be able to insert data");
      var laydelreq = {table: "Layer",
                       action: "delete",
                       id: result.insertId};
      nayar.do(laydelreq, function(err, delresult){
        test.equal(delresult.affectedRows, 1, "'do' should be able to delete inserted rows");
        test.done();
      });
    });
  },
  get_response_geo : function (test) {
    test.expect(8);
    var geo_query = {
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
    var geo_response = { layer: 'geotest',
     hotspots:
      [ { id: null,
          showSmallBiw: 0,
          showBiwOnClick: 0,
          inFocus: 0,
          imageURL: 'http://trstorey.sysreturn.net/lib/img/bioav.png',
          text:
           { title: 'nayartest',
             description: 'testing nayar',
             footnote: 'author: thomasrstorey' },
          anchor: { geolocation: { lat: 40.692842, lon: -73.931183 } },
          actions:
           [ { uri: 'http://test.test.com/test.txt',
               label: 'test action',
               contentType: 'text/plain',
               method: 'GET',
               params: null,
               activityType: 1,
               autoTriggerOnly: 0,
               showActivity: 0,
               activityMessage: null,
               autoTrigger: 0 } ],
          animations:
           { onCreate: [],
             onUpdate: [],
             onDelete: [],
             onFocus:
              [ { type: 'scale',
                  length: 1000,
                  delay: 0,
                  interpolationParam: null,
                  interpolation: 'linear',
                  persist: 0,
                  repeat: 0,
                  from: 0,
                  to: 2,
                  axis: { x: 1, y: 0, z: 0 } } ],
             onClick: [] },
          object:
           { id: null,
             contentType: 'model/vnd.layar.l3d',
             url: 'http://test.test.com/test.l3d',
             size: 2,
             previewImage: null },
          transform:
           { rotate: { rel: 0, axis: { x: 0, y: 0, z: 1 }, angle: 0 },
             translate: { x: 0.1, y: 0, z: 0 },
             scale: 1 } } ],
     errorCode: 0,
     errorString: 'ok' };

    // insert a geo layer + poi + data
    var layreq = {table: "Layer",
                  action: "set",
                  layer: "geotest",
                  poiType: "geo"};
    var poireq = {table: "Poi",
                  action: "set",
                  poiType: "geo",
                  lat: 40.692842,
                  lon: -73.931183,
                  title: "nayartest",
                  description: "testing nayar",
                  footnote: "author: thomasrstorey",
                  imageURL: "http:\/\/trstorey.sysreturn.net\/lib\/img\/bioav.png"};
    var objreq = {table: "Object",
                  action: "set",
                  url: "http://test.test.com/test.l3d",
                  contentType: "model/vnd.layar.l3d",
                  size: 2};
    var trnreq = {table: "Transform",
                  action: "set",
                  translate_x: 0.125};
    var anireq = {table: "Animation",
                  action: "set",
                  event: "onFocus",
                  type: "scale",
                  length: 1000,
                  delay: 0,
                  interpolation: "linear",
                  from: 0,
                  to: 2,
                  axis_x: 1.0,
                  axis_y: 0.0,
                  axis_z: 0.0};
    var actreq = {table: "Action",
                  action: "set",
                  uri: "http://test.test.com/test.txt",
                  contentType: "text/plain",
                  label: "test action",
                  method: "GET",
                  activityType: 1};
    nayar.do(layreq, function(err, layresult){
      var layerid = layresult.insertId;
      poireq.layerID = layerid;
      test.equal(layresult.affectedRows, 1, "'do' should be able to insert");
      nayar.do(poireq, function(err, poiresult){
        var poiid = poiresult.insertId;
        anireq.poiID = poiid;
        actreq.poiID = poiid;
        geo_response.hotspots[0].id = poiid;
        test.equal(poiresult.affectedRows, 1, "'do' should be able to insert");
        nayar.do(objreq, function(err, objresult){
          var objid = objresult.insertId;
          geo_response.hotspots[0].object.id = objid;
          test.equal(objresult.affectedRows, 1, "'do' should be able to insert");
          nayar.do(trnreq, function(err, trnresult){
            var trnid = trnresult.insertId;
            test.equal(trnresult.affectedRows, 1, "'do' should be able to insert");
            nayar.do(anireq, function(err, aniresult){
              var aniid = aniresult.insertId;
              test.equal(aniresult.affectedRows, 1, "'do' should be able to insert");
              nayar.do(actreq, function(err, actresult){
                var actid = actresult.insertId;
                test.equal(actresult.affectedRows, 1, "'do' should be able to insert");
                var poiupdreq = {table: "Poi",
                                 action: "update",
                                 id: poiid,
                                 objectID: objid,
                                 transformID: trnid};
                nayar.do(poiupdreq, function(err, poiupdresult){
                  test.equal(poiupdresult.changedRows, 1, "'do' should be able to update existing rows");
                  nayar.getResponse(geo_query, function(err, response){
                    test.deepEqual(response, geo_response, "getResponse should get and format geo hotspot data for layar API");
                    test.done();
                  });
                });
              });
            });
          });
        });
      });
    });
  },
  get_response_vis : function (test) {
    test.expect(8);
    var vis_query = {
      lang : "en",
      countryCode : "US",
      lat : 40.692842,
      lon : -73.931183,
      recognizedReferenceImage : "testimg",
      userId : "ed48067cda8e1b985dbb8ff3653a2da4fd490a37",
      radius : 250,
      layerName : "vistest",
      version : "6.0",
      action : "refresh",
      accuracy : 100
    };
    var vis_response = { layer: 'vistest',
     hotspots:
      [ { id: null,
          showSmallBiw: 0,
          showBiwOnClick: 0,
          inFocus: 0,
          anchor: {  referenceImage: "testimg" },
          actions:
           [ { uri: 'http://test.test.com/test2.txt',
               label: 'test action',
               contentType: 'text/plain',
               method: 'GET',
               params: null,
               activityType: 1,
               autoTriggerOnly: 0,
               showActivity: 0,
               activityMessage: null,
               autoTrigger: 0 } ],
          animations:
           { onCreate: [],
             onUpdate: [],
             onDelete: [],
             onFocus: [],
             onClick:
              [ { type: 'scale',
                  length: 2000,
                  delay: 0,
                  interpolationParam: null,
                  interpolation: 'overshoot',
                  persist: 0,
                  repeat: 0,
                  from: 0,
                  to: 2,
                  axis: { x: 1, y: 0, z: 0 } } ]},
          object:
           { id: null,
             contentType: 'model/vnd.layar.l3d',
             url: 'http://test.test.com/test2.l3d',
             size: 2,
             previewImage: null },
          transform:
           { rotate: { rel: 0, axis: { x: 0, y: 0, z: 1 }, angle: 0 },
             translate: { x: 0, y: -0.1, z: 0 },
             scale: 1 } } ],
     errorCode: 0,
     errorString: 'ok' };

    // insert a geo layer + poi + data
    var layreq = {table: "Layer",
                  action: "set",
                  layer: "vistest",
                  poiType: "vision"};
    var poireq = {table: "Poi",
                  action: "set",
                  poiType: "vis",
                  referenceImage: "testimg"};
    var objreq = {table: "Object",
                  action: "set",
                  url: "http://test.test.com/test2.l3d",
                  contentType: "model/vnd.layar.l3d",
                  size: 2};
    var trnreq = {table: "Transform",
                  action: "set",
                  translate_y: -0.125};
    var anireq = {table: "Animation",
                  action: "set",
                  event: "onClick",
                  type: "scale",
                  length: 2000,
                  delay: 0,
                  interpolation: "overshoot",
                  from: 0,
                  to: 2,
                  axis_x: 1.0,
                  axis_y: 0.0,
                  axis_z: 0.0};
    var actreq = {table: "Action",
                  action: "set",
                  uri: "http://test.test.com/test2.txt",
                  contentType: "text/plain",
                  label: "test action",
                  method: "GET",
                  activityType: 1};
    nayar.do(layreq, function(err, layresult){
      var layerid = layresult.insertId;
      poireq.layerID = layerid;
      test.equal(layresult.affectedRows, 1, "'do' should be able to insert");
      nayar.do(poireq, function(err, poiresult){
        var poiid = poiresult.insertId;
        anireq.poiID = poiid;
        actreq.poiID = poiid;
        vis_response.hotspots[0].id = poiid;
        test.equal(poiresult.affectedRows, 1, "'do' should be able to insert");
        nayar.do(objreq, function(err, objresult){
          var objid = objresult.insertId;
          vis_response.hotspots[0].object.id = objid;
          test.equal(objresult.affectedRows, 1, "'do' should be able to insert");
          nayar.do(trnreq, function(err, trnresult){
            var trnid = trnresult.insertId;
            test.equal(trnresult.affectedRows, 1, "'do' should be able to insert");
            nayar.do(anireq, function(err, aniresult){
              var aniid = aniresult.insertId;
              test.equal(aniresult.affectedRows, 1, "'do' should be able to insert");
              nayar.do(actreq, function(err, actresult){
                var actid = actresult.insertId;
                test.equal(actresult.affectedRows, 1, "'do' should be able to insert");
                var poiupdreq = {table: "Poi",
                                 action: "update",
                                 id: poiid,
                                 objectID: objid,
                                 transformID: trnid};
                nayar.do(poiupdreq, function(err, poiupdresult){
                  test.equal(poiupdresult.changedRows, 1, "'do' should be able to update existing rows");
                  nayar.getResponse(vis_query, function(err, response){
                    test.deepEqual(response, vis_response, "getResponse should get and format geo hotspot data for layar API");
                    test.done();
                  });
                });
              });
            });
          });
        });
      });
    });
  },
  tearDown : function (done) {
    function bedone(done){
      console.log("teardown");
      nayar.close();
    }
    if(bedonetimer) clearTimeout(bedonetimer);
    bedonetimer = setTimeout(bedone, 1000);
    done();
  }
}
