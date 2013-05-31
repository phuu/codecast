// codecast

var pkg            = require('./package.json'),
    express        = require('express'),
    http           = require('http'),
    fs             = require('fs'),
    path           = require('path');

var passport       = require('passport'),
    GitHubStrategy = require('passport-github').Strategy;

var io             = require('socket.io');

var redis          = require("redis"),
    redisClient    = redis.createClient(),
    RedisStore     = require('connect-redis')(express);

var redismemoriser = require('./lib/redismemoriser'),
    uid            = require('./lib/uid')(Object.create(redismemoriser));

/**
 * Configuration
 * See: http://s.phuu.net/12PFa6J
 */

// Grab the config file if it's there
var configFile;
try {
  configFile = require('../config.json');
} catch (e) {
  configFile = {};
}

// Then configure!
var config = {
  port: parseInt(process.argv[2], 10) ||
        3500,
  github: {
    id: configFile.GITHUB_ID ||
        process.env.GITHUB_ID,
    secret: configFile.GITHUB_SECRET ||
            process.env.GITHUB_SECRET
  },
  session: {
    secret: configFile.SESSION_SECRET ||
            process.env.SESSION_SECRET ||
            'keyboard fricking cat'
  }
};

/**
 * Passport express
 */

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


passport.use(new GitHubStrategy({
    clientID: config.github.id,
    clientSecret: config.github.secret
  },
  function(accessToken, refreshToken, profile, done) {
    console.log.apply(console, [].slice.call(arguments));
    return done(null, {
      access_token: accessToken,
      profile: profile
    });
  }
));

/**
 * Configure & setup
 */

// Database

redisClient.on("error", function (err) {
  console.log("Error " + err);
});

// Express

var app = express();
var server = http.createServer(app);
io = io.listen(server);

// io.enable('browser client minification');  // send minified client
io.enable('browser client gzip');
io.set('transports', [
  'websocket'
]);

app.set('port', config.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', function (path, options, fn) {
  if ('function' == typeof options) {
    fn = options, options = {};
  }
  fs.readFile(path, 'utf8', fn);
});
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({
  secret: config.session.secret,
  store: new RedisStore({
    client: redisClient
  })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

app.configure('development', function () {
  app.use(express.errorHandler());
});

app.configure('production', function () {
  app.use(function (req, res, next, err) {
    res.send('There was an error, sorry.');
  });
});

/**
 * Utils
 */

var rk = function () {
  return [].slice.call(arguments).join(':');
};

var getRoom = function (id, cb) {
  return redisClient.get(rk('room', id), function (err, reply) {
    if (err) return cb(err);
    if (!reply) return cb(null, null);
    var room;
    try { room = JSON.parse(reply); }
    catch (e) { return cb(new Error('Malformed room data.')); }
    return cb(null, room);
  });
};

var setRoom = function (id, data, cb) {
  return redisClient.set(rk('room', id), JSON.stringify(data));
};

var roomStat = function (id, stat, amount, cb) {
  getRoom(id, function (err, room) {
    console.log.apply(console, [].slice.call(arguments));
    if (err) return cb(err);
    if (!room) return cb(new Error("No such room."), null);
    if (!room.stats) room.stats = {};
    // -1 to compensate for the coder
    if (typeof room.stats[stat] === "undefined") room.stats[stat] = -1;
    room.stats[stat] += amount;
    console.log('saving', room);
    setRoom(id, room);
    cb(null, room.stats);
  });
};

/**
 * Routes
 */

// Authentication
app.get('/auth/github',
  passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

// API
app.get('/api/user',
  function (req, res) {
    res.jsonp(req.user || {});
  });

app.post('/api/room',
  function (req, res) {
    uid.generate(4, function (err, id) {
      if (err) return res.jsonp(500, err);
      var data = {
        id: id,
        stats: {}
      };
      res.jsonp(data);
      setRoom(id, data);
    });
  });

app.get('/api/room/:id',
  function (req, res) {
    getRoom(req.params.id, function () {
      if (err) return res.jsonp(500, err);
      res.jsonp(room);
    });
  });

// Serve the templates
app.get('/template/:file', function (req, res) {
  res.render('template/' + req.params.file, {
    layout: false
  });
});

// Serve the front end
app.get('/*?', function (req, res) {
  res.render('index', {
    layout: false
  });
});

/**
 * Realtime
 */

var chat = io.of('/chat');
chat.on('connection',
  function (socket) {
    socket.on('join', function (room) {
      socket.room = room;
      socket.join(room);
    });
    socket.on('chat:msg', function (data) {
      socket
        .broadcast
        .to(socket.room)
        .emit('chat:msg', data);
    });
  });

var code = io.of('/code');
code.on('connection',
  function (socket) {
    // Client joins room
    socket.on('join', function (room) {
      socket.room = room;
      socket.join(room);
      // Bump the stats
      roomStat(room, 'viewers', 1, function (err, stats) {
        if (err) return console.log("error bumping stats", err);
        io
          .of('/code')
          .in(socket.room)
          .emit('stat:change', stats);
      });
    });
    // Client disconnected
    socket.on('disconnect', function () {
      // Bump the stats
      roomStat(socket.room, 'viewers', -1, function (err, stats) {
        if (err) return console.log("error bumping stats", err);
        io
          .of('/code')
          .in(socket.room)
          .emit('stat:change', stats);
      });
    });
    // Notify everybody else of code change
    socket.on('code:change', function (data) {
      socket
        .broadcast
        .to(socket.room)
        .emit('code:change', data);
    });
  });

/**
 * Gogogo
 */

server
  .listen(app.get('port'), function(){
    console.log("Server listening on port " + app.get('port'));
  });
