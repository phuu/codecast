// codecast

var pkg            = require('./package.json'),
    express        = require('express'),
    http           = require('http'),
    fs             = require('fs'),
    path           = require('path');

var passport       = require('passport'),
    GitHubStrategy = require('passport-github').Strategy;

var io             = require('socket.io');

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
 * Configure express
 */

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
app.use(express.session({ secret: 'keyboard cat' }));

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
