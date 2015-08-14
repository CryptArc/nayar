/*
 * nayar
 * https://github.com/thomasrstorey/nayar
 *
 * Copyright (c) 2015 thomasrstorey
 * Licensed under the MIT license.
 */

'use strict';


var MySQLHandler = function () {

  var mysql = require('mysql');
  var jsf = require('jsonfile');
  var path = require('path');

  var self = {};
  self.config = jsf.readFileSync(path.join(__dirname, '../db/config.json')).mysql;

  var tableSpecs = self.config.tables;
  var conn = null;

  // --- MySQL Handler implementation specific functions and variables ---

  /*
  request object:
  {
    table :
    columns :
    where :
    limit :
  }
  */

  self.formatSelect = function(req){
    var out = "SELECT * FROM ?? WHERE ?";
    var inserts = [req.table, req.where];
    out = mysql.format(out, inserts);
    if(req.limit){
      out += " LIMIT "+req.limit[0]+", "+req.limit[1];
    }
    return out+";";
  };

  self.formatCreate = function (table){
    var out = "CREATE TABLE IF NOT EXISTS " + "`"+table.name+"` (";
    for (var key in table.columns) {
      if (table.columns.hasOwnProperty(key)) {
        out += "`"+key+"` "+table.columns[key].type;
        if(table.columns[key].length !== null){
          out += "("+table.columns[key].length+") ";
        } else {
          out += "("+table.columns[key].value+") ";
        }
        out += table.columns[key].options+", ";
      }
    }
    out = out.slice(0,-2)+" ";
    out += ") DEFAULT CHARSET=utf8 AUTO_INCREMENT=1";
    return out+" ;";
  };

  self.formatInsert = function (req){
    var format = "INSERT INTO ?? SET ? ;";
    var inserts = [req.table, req.columns];
    return mysql.format(format, inserts);
  };

  self.formatUpdate = function(req){
    var format = "UPDATE ?? SET ? WHERE ? ;";
    var inserts = [req.table, req.columns, req.where];
    return mysql.format(format, inserts);
  }

  self.formatDelete = function (req){
    var format = "DELETE FROM ?? WHERE ? ;";
    var inserts = [req.table, req.where];
    return mysql.format(format, inserts);
  }

  // --- Nayar DB Handler interface ---

  // Setup functions ---

  self.init = function (cb){
    if(!conn){
      conn = self.connect();
      var numTables = Object.keys(tableSpecs).length;
      var i = 0;
      var results = [];
      for (var key in tableSpecs) {
        if (tableSpecs.hasOwnProperty(key)) {
          var q = self.formatCreate(tableSpecs[key]);
          conn.query(q, function(err, result){
            if(err) handleMysqlErr(err, cb);
            ++i;
            results.push(result);
            if(i === numTables){
              return cb(null, results);
            }
          });
        }
      }
    } else {
      process.nextTick(cb(null, {connected: true}));
    }
  };

  self.connect = function (){
    return mysql.createConnection(self.config.connection);
  }

  self.disconnect = function (){
    if(conn) conn.end();
    conn = null;
  }

  self.get = function (req, cb){
    var q = self.formatSelect(req);
    conn.query(q, function(err, rows){
      if(err) handleMysqlErr(err, cb);
      if(rows.length === 0){
        return cb(new Error("no "+req.table+"s match that query!"));
      } else {
        return cb(null, rows);
      }
    });
  };

  self.set = function (req, cb){
    var q;
    if(req.where){
      q = self.formatUpdate(req);
    } else {
      q = self.formatInsert(req);
    }
    conn.query(q, function(err, result){
      if(err) handleMysqlErr(err, cb);
      return cb(null, result);
    });
  };

  self.delete = function(req, cb){
    var q = self.formatDelete(req);
    conn.query(q, function(err, result){
      if(err) handleMysqlErr(err, cb);
      return cb(null, result);
    });
  };

  function handleMysqlErr(error, callback){
    if(error.fatal){
      // SHUT DOWN EVERYTHING
      console.error("Fatal db error!: ", error.code, error.message);
      // Throw error that should propagate up to the getPOIs try-catch
      // throw error;
    } else {
      console.error("Non-fatal db error: ", error.code, error.message);
      if(callback) return callback(error);
      return;
    }
    throw error;
  }

  // Layer functions ---

  // self.getLayer = function (req, cb){
  //   var where = { "layer" : req.layerName };
  //   var qstr = formatSelect({"table" : "Layer",
  //                            "where" : where,
  //                            "limit" : [0, 1]});
  //   conn.query(qstr, function (err, rows, fields){
  //     if(err) handleMysqlErr(err, cb);
  //     if(rows.length === 0){
  //       return cb(new Error("no layers found with that layer name"), []);
  //     } else {
  //       // should only find one layer, so just return the first
  //       return cb(null, rows[0]);
  //     }
  //   });
  // };



  // self.setLayer = function (req, cb){
  //   // construct get request from set request
  //   var getreq = {layerName : req.layer};
  //   self.getLayer(getreq, function(err, data){
  //     if(data.length === 0){
  //       // no layer with that name, make it
  //       insertLayer(req, function(err, res){
  //         return cb(err, res);
  //       });
  //     } else {
  //       // there is a layer with that name
  //       // update it with new parameters
  //       updateLayer(req, function(err, res){
  //         return cb(err, res);
  //       });
  //     }
  //   });
  // };

  // self.insert = function (req, cb){
  //   var insertreq = {};
  //   insertreq.table = req.table;
  //   insertreq.columns = {};
  //   for (var key in req) {
  //     if (object.hasOwnProperty(key) && key!=="table") {
  //       insertreq.columns[key] = req[key];
  //     }
  //   }
  //   var qstr = formatInsert(insertreq);
  //   conn.query(qstr, function(err, data){
  //     if(err) handleMysqlErr(err, cb);
  //     return cb(data);
  //   });
  // };

  // // POI functions ---
  //
  // self.getPOI = function (req, cb){
  //
  // }
  // self.getPOIs = function (req, cb){
  //
  // }
  // self.setPOI = function (req, cb){
  //
  // }
  //
  // // Action functions ---
  //
  // self.getAction = function (req, cb){
  //
  // }
  // self.getActions = function (req, cb){
  //
  // }
  // self.setAction = function (req, cb){
  //
  // }
  //
  // // Animation functions ---
  //
  // self.getAnimation = function (req, cb){
  //
  // }
  // self.getAnimations = function (req, cb){
  //
  // }
  // self.setAnimation = function (req, cb){
  //
  // }
  //
  // // Object functions ---
  //
  // self.getObject = function (req, cb){
  //
  // }
  // self.setObject = function (req, cb){
  //
  // }
  //
  // // Transform functions ---
  //
  // self.getTransform = function (req, cb){
  //
  // }
  // self.setTransform = function (req, cb){
  //
  // }

  return self;

};

module.exports = MySQLHandler();
