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
      redisClient.set(rk('room', id), JSON.stringify(data));
    });
  });

app.get('/api/room/:id',
  function (req, res) {
    redisClient.get(rk('room', req.params.id), function (err, reply) {
      if (err) return res.jsonp(500, err);
      var room;
      try { room = JSON.parse(reply); }
      catch(e) { return res.jsonp(500, { error: 'Malformed room data.'}); }
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
  console.log(req.user);
  console.log(req.session);
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
    socket.on('join', function (room) {
      socket.room = room;
      socket.join(room);
    });
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
