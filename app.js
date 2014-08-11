var express = require('express'),
    routes = require('./routes'),
    path = require('path'),
    mongoose = require('mongoose');

var mongoURI = process.env.MONGOLAB_URI || 'mongodb://localhost/zonestar';
mongoose.connect(mongoURI);

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon(path.join(__dirname, 'favicon.ico')));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

/** 
 * ROUTES .
 */ 

app.get('/', routes.index);
app.get('/posts', routes.posts);
app.get('/post/:id', routes.showPost);
app.get('/about', routes.about);
app.post('/post/:id/star', routes.star);

if ('development' == app.get('env'))
  app.post('/', routes.devPost);
else
  app.post('/', routes.post);

app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});