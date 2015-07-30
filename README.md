# nayar [![Build Status](https://secure.travis-ci.org/thomasrstorey/nayar.png?branch=master)](http://travis-ci.org/thomasrstorey/nayar)

library and API wrapper for Layar webservices providing POI data for geo and vision layers

## Usage
1. Install the module with: `npm install nayar`
* setup your database with the included db.sql file
* load your data into the databse however works for you
* configure nayar
* call getPOIs to with an object of Layar getPOIs request parameters:

```javascript
var nayar = require('nayar');
nayar.setConfig({user: 'root', pass: 'pass', db: 'nayar_db'});
//...if using express for instance...
app.get('/layar', function(req, res){
  nayar.getPOIs(req.query, function(err, resjson){
    if(err) console.error(error);
    res.json(resjson);
  });
});
```

## Documentation
### nayar Methods

#### setConfig
```javascript
nayar.setConfig([config object]);
```

#### getConfig
```javascript
nayar.getConfig();
//=> {user: 'user', pass: 'pass', db: 'db', port:'8030'}
```

#### getPOIs
```javascript
nayar.getPOIs(req.query, function(err, resjson){
  console.dir(resjson);
});
//=>{ layer: 'geotest',
//     hotspots:
//      [ { id: 'geo_test',
//          imageURL: 'http://trstorey.sysreturn.net/lib/img/bioav.png',
//          text:
//           { title: 'nayartest',
//             description: 'testing nayar',
//             footnote: 'author: thomasrstorey' },
//          anchor: { geolocation: { lat: 40.692842, lon: -73.931183 } } } ],
//     errorCode: 0,
//     errorString: 'ok' }

```

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2015 thomasrstorey  
Licensed under the MIT license.
