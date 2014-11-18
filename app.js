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

var mail = require("nodemailer").mail;
exports.contact = function(req, res){
  var body = req.body;
  mail({
      from: body.firstName + ' ' + body.lastName + ' <' + body.email + '>', // sender address
      to: 'alex.1990.01@gmail.com', // list of receivers
      subject: 'ZoneStar', // Subject line
      text: body.message, // plaintext body
      html: '<div>' + body.message + '</div>' // html body
  });
  res.send({success: true});
}