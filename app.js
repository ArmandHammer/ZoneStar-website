var express = require('express');
var app = express();
var oneDay = 86400000;
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

var port = Number(process.env.PORT || 8080);
app.listen(port, function(){
	console.log("listening on port " + port);
});