// codecast

if (process.env.NODE_ENV === 'production') {
  require('nodetime').profile({
    accountKey: 'fcd6df5a6b9a7723f77213bc88d421c0399fdb31',
    appName: 'Codecast'
  });
}

var pkg            = require('./package.json'),
    express        = require('express'),
    _              = require('underscore'),
    async          = require('async'),
    http           = require('http'),
    fs             = require('fs'),
    path           = require('path');

var passport       = require('passport'),
    GitHubStrategy = require('passport-github').Strategy;

var io             = require('socket.io');

var redis          = require('redis'),
    RedisStore     = require('connect-redis')(express);

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
  },
  redis: {
    url: configFile.REDIS_URL ||
         process.env.REDIS_URL,
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD
  }
};

console.log(config);

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

var redisClient = redis.createClient(config.redis.port, config.redis.host);
redisClient.auth(config.redis.password);
redisClient.on("error", function (err) {
  console.log(err);
});
redisClient.on("connect", function (err) {
  console.log('Redis connected.');
});

var redismemoriser = Object.create(require('./lib/redismemoriser')).init({
      client: redisClient
    }),
    uid = require('./lib/uid')(redismemoriser);

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

/**
 * Redis
 */

var rk = function () {
  return [].slice.call(arguments).join(':');
};

var getThing = function (thing, id, cb) {
  redisClient.keys(rk(thing, id, '*'), function (err, fullKeys) {
    if (err) return cb(err);
    if (!fullKeys) return cb(null, null);
    // Grab only the last part of the key
    var keys = fullKeys.map(function (fullKey) {
      return _.last(fullKey.split(':'));
    });
    // Iterate over them and grab some data
    async.map(keys, function (key, done) {
      redisClient.get(rk(thing, id, key), done);
    }, function (err, values) {
      if (!cb) return;
      if (err) return cb(err);
      cb(null, _.object(keys, values));
    });
  });
};

var setThing = function (thing, id, data, cb) {
  async.map(Object.keys(data), function (key, done) {
    redisClient.set(rk(thing, id, key), data[key], done);
  }, function (err) {
    if (err) return cb(err);
    getThing(thing, id, cb);
  });
};

/**
 * Room
 */

var getRoom = getThing.bind(null, 'room');

var setRoom = setThing.bind(null, 'room');

var incrRoom = function (id, key, amount, cb) {
  redisClient.incrby(rk('room', id, key), amount, function (err, reply) {
    if (err) return cb(err);
    getRoom(id, cb);
  });
};

/**
 * Code
 */

var getCode = getThing.bind(null, 'code');

var setCode = setThing.bind(null, 'code');

/**
 * Chat
 */

var addChat = function (id, data, cb) {
  redisClient.rpush(rk('chat', id), JSON.stringify(data), cb);
};

var getChat = function (id, cb) {
  redisClient.lrange(rk('chat', id), 0, -1, function (err, rawMessages) {
    if (err) return cb(err);
    if (!rawMessages) return cb();
    var messages = rawMessages.map(JSON.parse.bind(JSON));
    cb(null, messages);
  });
};

/**
 * Auth
 */

var authenticate = function (req, res, next) {
  if (req.user) return next();
  res.jsonp(401, { error: 'Not authorized.' });
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
  authenticate,
  function (req, res) {
    uid.generate(4, function (err, id) {
      if (err) return res.jsonp(500, err);
      var data = {
        id: id,
        owner: req.user.profile.id,
        viewers: -1
      };
      setRoom(id, data, function (err, room) {
        if (err) return res.jsonp(500, err);
        res.jsonp(room);
      });
    });
  });

app.get('/api/room/:id',
  function (req, res) {
    getRoom(req.params.id, function (err, room) {
      if (err) return res.jsonp(500, err);
      if (!room) return res.jsonp(404);
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
      getChat(socket.room, function (err, messages) {
        console.log('chat', messages);
        if (err) return console.log(err);
        if (!messages) return;
        socket.emit('chat:msgs', messages);
      });
    });
    socket.on('chat:msg', function (rawData) {
      // Clean up the chat data
      var data = Object.keys(rawData).reduce(function (data, key) {
        if (key !== 'body' && key !== 'author') return data;
        data[key] = (''+rawData[key]).trim();
        return data;
      }, {});
      if (!(data.body && data.author)) return;
      // Persist it and emit
      addChat(socket.room, data);
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
      // Retrieve the code for this room
      getCode(socket.room, function (err, data) {
        if (err) return console.log(err);
        socket.emit('code:change', data);
      });
    });
    // Notify everybody else of code change
    socket.on('code:change', function (data) {
      setCode(socket.room, data);
      socket
        .broadcast
        .to(socket.room)
        .emit('code:change', data);
    });
  });

var room = io.of('/room');
room.on('connection',
  function (socket) {
    // Client joins room
    socket.on('join', function (room) {
      socket.room = room;
      socket.join(room);
      // Pull out the currently connected viewers
      var viewers = Object.keys(io.of('/room').in(socket.room).sockets).length;
      // Save the number of viewers and send it on back
      setRoom(socket.room, { viewers : viewers }, function (err, room) {
        if (err) return;
        io.of('/room')
          .in(socket.room)
          .emit('room:change', room);
      });
    });
    // Client disconnected
    socket.on('disconnect', function () {
      incrRoom(socket.room, 'viewers', -1, function (err, room) {
        if (err) return;
        io.of('/room')
          .in(socket.room)
          .emit('room:change', room);
      });
    });
  });

/**
 * Gogogo
 */

server
  .listen(app.get('port'), function(){
    console.log("Server listening on port " + app.get('port'));
  });
