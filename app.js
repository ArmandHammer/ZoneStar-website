var express = require('express');
var app = express();
var oneDay = 86400000;
var userCount = 0;
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

var port = Number(process.env.PORT || 8080);
app.listen(port, function(){
	userCount++;
	console.log("listening on port " + port);
});