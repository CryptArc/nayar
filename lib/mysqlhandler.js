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

  var pool = mysql.createPool(self.config.connection);

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
    var out = "SELECT * FROM ??";
    if(req.where) out += " WHERE ?";
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
      self.connect(function(err, connection){
        conn = connection;
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
      });
    } else {
      process.nextTick(cb(null, {connected: true}));
    }
  };

  self.connect = function (cb){
    pool.getConnection(cb);
  }

  self.disconnect = function (){
    if(conn) conn.release();
    conn = null;
  }

  self.close = function (cb){
    pool.end(function(err){
      if(err){
        console.error(err);
        return cb(1);
      } else {
        return cb(0);
      }
    });
  }

  self.get = function (req, cb){
    var q = self.formatSelect(req);
    if(conn){
      conn.query(q, function(err, rows){
        if(err) handleMysqlErr(err, cb);
        if(rows.length === 0){
          return cb(null, []);
        } else {
          return cb(null, rows);
        }
      });
    } else {
      self.connect(function(err, connection){
        connection.query(q, function(err, rows){
          if(err) handleMysqlErr(err, cb);
          if(rows.length === 0){
            connection.release();
            return cb(null, []);
          } else {
            return cb(null, rows);
          }
        });
      })
    }
  };

  self.set = function (req, cb){
    var q;
    if(req.where){
      q = self.formatUpdate(req);
    } else {
      q = self.formatInsert(req);
    }
    console.log(q);
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

  return self;

};

module.exports = MySQLHandler();
