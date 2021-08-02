'use strict';

var request = require('request'),
  debug = require('debug')("google:dm"),
  qs = require('qs-google-signature');

var validTravelModes = ['driving', 'walking', 'bicycling', 'transit'];
var validRegions = ['AC','AD','AE','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CO','CR','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SZ','TA','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','XK','YE','YT','ZA','ZM','ZW','AC','AD','AE','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CO','CR','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SZ','TA','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','XK','YE','YT','ZA','ZM','ZW']
var validUnits = ['metric', 'imperial'];
var validRestrictions = ['tolls', 'highways', 'ferries', 'indoor'];
var validTrafficModel = ['best_guess', 'pessimistic', 'optimistic'];
var validTransitMode = ['bus', 'subway', 'train', 'tram', 'rail'];
var validTransitRoutingPreference = ['less_walking', 'fewer_transfers'];

var GOOGLE_DISTANCE_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json?',
  SEPARATOR = '|',

  // free api key
  GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || null,

  // maps for business users key
  GOOGLE_CLIENT_KEY = process.env.GOOGLE_BUSINESS_CLIENT_KEY || null,
  GOOGLE_SIGNATURE_KEY = process.env.GOOGLE_SIGNATURE_KEY || null;


var GoogleDistanceMatrix = function() {
  this.options = {
    origins: null,
    destinations: null,
    mode: 'driving',
    units: 'metric',
    language: 'en',
    avoid: null
  }
  if (GOOGLE_CLIENT_KEY && GOOGLE_SIGNATURE_KEY) {
    debug("Using Business Client/Key pair", GOOGLE_CLIENT_KEY, GOOGLE_SIGNATURE_KEY)
    this.options.client = GOOGLE_CLIENT_KEY;
    this.options.signature = GOOGLE_SIGNATURE_KEY;
  } else {
    debug("Using simple API Key", GOOGLE_API_KEY)
    this.options.key = GOOGLE_API_KEY;
  }
};

function formatLocations(locations) {
  return locations.join(SEPARATOR);
}

function makeRequest(options, callback) {
  debug("request options", options)
  var requestURL = GOOGLE_DISTANCE_API_URL + qs.stringify(options, GOOGLE_DISTANCE_API_URL);
  debug("requestURL", requestURL)
  request(requestURL, function(err, response, data) {
    if (err || response.statusCode != 200) {
      return callback(new Error('Google API request error: ' + data));
    }
    callback(null, JSON.parse(data));
  })
}

GoogleDistanceMatrix.prototype.matrix = function(args, cb) {

  // validate arguments

  if (arguments.length < 3) {
    throw new Error('Invalid number of arguments');
  }
  var callback = arguments[arguments.length - 1];
  if (typeof callback != 'function') {
    throw new Error('Missing callback function');
  }

  // format arguments

  this.options.origins = formatLocations(arguments[0]);
  this.options.destinations = formatLocations(arguments[1]);

  // makes a request to google api

  makeRequest(this.options, function(err, data) {
    if (err) {
      return callback(err);
    }
    return callback(null, data);
  });

}

GoogleDistanceMatrix.prototype.mode = function(mode) {
  if (validTravelModes.indexOf(mode) < 0) {
    throw new Error('Invalid mode: ' + mode);
  }
  this.options.mode = mode;
}

GoogleDistanceMatrix.prototype.language = function(language) {
  this.options.language = language;
}

GoogleDistanceMatrix.prototype.avoid = function(avoid) {
  if (validRestrictions.indexOf(avoid) < 0) {
    throw new Error('Invalid restriction: ' + avoid);
  }
  this.options.avoid = avoid;
}

GoogleDistanceMatrix.prototype.units = function(units) {
  if (validUnits.indexOf(units) < 0) {
    throw new Error('Invalid units: ' + units);
  }
  this.options.units = units;
}

GoogleDistanceMatrix.prototype.departure_time = function(departure_time) {
  this.options.departure_time = departure_time;
}

GoogleDistanceMatrix.prototype.arrival_time = function(arrival_time) {
  this.options.arrival_time = arrival_time;
}

GoogleDistanceMatrix.prototype.key = function(key) {
  delete this.options.client;
  delete this.options.signature;
  this.options.key = key;
}

GoogleDistanceMatrix.prototype.client = function(client) {
  delete this.options.key;
  this.options.client = client;
}

GoogleDistanceMatrix.prototype.signature = function(signature) {
  delete this.options.key;
  this.options.signature = signature;
}

GoogleDistanceMatrix.prototype.traffic_model = function(trafficModel) {
  this.options.traffic_model = trafficModel;
}

GoogleDistanceMatrix.prototype.transit_mode = function(transitMode) {
  this.options.transit_mode = transitMode;
}

GoogleDistanceMatrix.prototype.transit_routing_preference = function(transitRoutingPreference) {
  this.options.transit_routing_preference = transitRoutingPreference;
}

GoogleDistanceMatrix.prototype.reset = function() {
  this.options = {
    origins: null,
    destinations: null,
    mode: 'driving',
    units: 'metric',
    language: 'en',
    avoid: null
  };
}

module.exports = new GoogleDistanceMatrix();
