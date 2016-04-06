# nayar [![Build Status](https://secure.travis-ci.org/thomasrstorey/nayar.png?branch=master)](http://travis-ci.org/thomasrstorey/nayar)

library and API wrapper for Layar webservices providing POI data for geo and vision layers

##Installation

###Prerequisites

* node, npm
* mysql

###Install

* `git clone https://github.com/thomasrstorey/nayar.git`
* `cd nayar`
* edit `db/config.json` with your mysql user credentials and pre-initialized database name.
* `node app/server.js`
* navigate to yoururl.com:8188 to see the dashboard, create an admin user

##Usage

Please refer to the <a href="https://www.layar.com/documentation/browser/api/">Layar API Documentation</a> for information on how to set up your layers.

###Admin

The first user is the admin. Before any subsequent users can use the Layers page, the admin has to set them to "Active" via the Users page.

##Info

###Version
  <p>1.1.3</p>
###Recent Changes

* Opacity animation added in accordance with Layar API v8.4
* Improved error handling. If a database error occurs, the message will propagate up to the user with a helpful error code that can help diagnose the problem.
* Improved stability
* User system - first user is admin, subsequent users are users. Admin has elevated privileges, like the ability to see/edit any layer and the ability to delete and activate other users. Users can only see their own layers and cannot manage user info.
* All forms are now formatted to fit on screen more nicely and be more readable.

###Repository
<a href="http://github.com/thomasrstorey/nayar/">github</a>
###Contributors
<p>Thomas R Storey | <a href="http://github.com/thomasrstorey/">github</a> <a href="mailto:storey.thomas@gmail.com">email</a></p>
###Sponsors>
<p>Kristin Lucas | <a href="http://kristinlucas.com/">website</a> </p>
###Acknowledgements
<p>Thanks so much to Kristin for providing the impetus, inspiration, testing, and funding for this project!</p>
</div>

## License
Copyright (c) 2015 thomasrstorey  
Licensed under the MIT license.
