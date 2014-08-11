var express = require('express');
var app = express();
var oneDay = 86400000;
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));
app.listen(8080);
console.log("listening on port 8080");