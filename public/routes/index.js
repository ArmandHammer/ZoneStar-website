var lp = require('../models/post');

/*
 * GET home page.
 */
 
exports.index = function (req, res) {  
  var box = req.cookies.box;

  try {
    box = JSON.parse(box);
  } catch(error) {
    box=[[43.470961366496134,-80.5466819021301],
         [43.47360860451491,-80.54303409786985]]; // box around UWaterloo
  }
           
  lp.findPostsWithinBox(box)
    .where({_reply_to: null})
    .limit(20)
    .sort({ $natural: -1 })
    .select('lat lng message signature thumb stars tag _reply_to')
    .setOptions({ lean: true })
    .exec(function (err, posts){
      if (err) throw err;

      res.render('index', {posts: JSON.stringify(posts),
                           box: JSON.stringify(box)
                           //,thumb_path: process.env.NODE_ENV=='production' ? 
                           //'http://s3.amazonaws.com/belloh/thumbs/' : '/images/thumbs/'
					});
     });
};

/*
 * GET posts.
 */
 
exports.posts = function (req, res) { 
  var query;
  
  var box = req.query.box;
  if (box) {
    query = lp.findPostsWithinBox(req.query.box);
  } else {
    query = lp.LocationPost.find();
  }
  
  var elder_id = req.query.elder_id;
  var fresh_id = req.query.fresh_id;
  var top = req.query.top;
  
  if (elder_id) {
    query = query.where({ _id: { $lt: elder_id } });
  } else if(fresh_id) {
    query = query.where({ _id: { $gt: fresh_id } });
  }
  
  var filter = req.query.filter;
  if (filter) {
    var re = new RegExp(filter,'i');
    query = query.where({$or: [{message: re}, {signature: re}]});
  }
  
  var tag = req.query.tag;
  if (tag) {
    var re = new RegExp(tag,'i');
    query = query.where({tag: re});
  }

  var reply_to = req.query.reply_to;
  if (reply_to) {
    query = query.where({_reply_to: reply_to});
  } else {
    query = query.where({_reply_to: null})
  }

  var top = req.query.top;
  console.log(top);
  if (top === 'true') {
    query = query.sort([['stars','desc'], ['$natural', 'desc']]);
  } else {
    query = query.sort({ $natural: -1 });
  }
  
  query.limit(20)
       .select('lat lng message signature thumb stars tag _reply_to')
       .setOptions({ lean: true })
       .exec(function (err, posts) {
         if (err) {
           throw err;
         }
         res.removeHeader('X-Powered-By'); // remove useless header
         res.json(posts);
       }); 
};

/* 
* GET post .
*/

exports.showPost = function (req, res) {
  try {
    lp.ObjectId(req.params.id);
  } catch(error) {
    res.status(404).send('Not found');
    return;
  }
  lp.LocationPost.findById(req.params.id)
                 .select('lat lng message signature thumb stars')
                 .exec(function (err, post){
                   if (err) {
                     throw err;
                   }
                   res.render('post', {post: JSON.stringify(post)});
                 });
};

/* 
* POST post .
*/

var Validator = require('validator').Validator;
var Sanitizer = require('validator').Sanitizer;

Validator.prototype.error = function (msg) {
  this._errors.push(msg);
  return this;
}

Validator.prototype.getErrors = function () {
  return this._errors;
}

var im = require('imagemagick');
var fs = require('fs');

function isFloat (x) {
  return !isNaN(parseFloat(x));
}

function htmlEscape (str) {
  return (str.replace(/&/g, '&amp;')
             .replace(/"/g, '&quot;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;'));
}

function createPost (req, res, callback) {
  var validator = new Validator();
 
  var data = req.body;
  
  console.log(data);
   
  validator.check(data['message'], 'Post has a maximum of 1000 characters').len(0,1000);
  validator.check(data['signature'], 'Signature has a maximum of 60 characters').len(0,60);
  validator.check(data['message'], "Post can't be empty").notEmpty();
  
  var errors = validator.getErrors();
  if (errors.length) {
    res.json({errors: errors});
    return;
  }
  
  data.message = htmlEscape(data.message);
  data.signature = htmlEscape(data.signature);
  
  if (data['signature']=='') {
    data['signature']='anonymous';
  }

  if (!isFloat(data['lat']) || !isFloat(data['lng'])) {
    res.json({errors: ['Latitude/Longitude are invalid']});
    return;
  }
  
  var post = new lp.LocationPost(data);
  
  function savePost(has_thumb) {
    post['thumb'] = has_thumb;
    post.save(function(e) {
      if (e) throw e;
      res.json(post);
    });
  };

  function createThumbnailAndSavePost(src) {
    var key = 'thumbs/'+post._id+'.jpg';
    im.resize({
      srcPath: src,
      width : 60,
      height : "60^",
      customArgs: [
        "-gravity", "center"
       ,"-extent", "60x60"
      ],
      concurrency: 4,
      quality: 0.5 },
      function (err, stdout, stderr) {
        if (err) {
          console.log(err);
          savePost(false);
        } else {
          callback(stdout,key,savePost);
        }
      });
  }
}

exports.devPost = function (req, res) {
  createPost(req, res, function(stdout,key,savePost){
    fs.writeFile('public/images/'+key, stdout, 'binary', function(err){
      if (err) {
        console.log(err);
        savePost(false);
      } else {
        console.log('Successfully saved dat shit');
        savePost(true);
      }
    });
  });
};

var AWS = require('aws-sdk');
var s3 = new AWS.S3();

exports.post = function (req, res) {
  createPost(req, res, function(stdout,key,savePost){    
    var params = {Bucket: 'belloh', Key: key, ACL:'public-read',
                  Body: new Buffer(stdout, 'binary')};
    s3.putObject(params, function(err, data) {
      if (err) {
        console.log(err);
        savePost(false);
      }
      else {
        console.log("Successfully uploaded data to S3");
        savePost(true);
      }
    });
  });
};

exports.star = function (req, res) {
  try {
    lp.ObjectId(req.params.id);
  } catch(error) {
    res.status(404).send('Not found');
    return;
  }
  lp.LocationPost.findByIdAndUpdate(req.params.id, { $inc: { stars: 1 } }, function(err, post){
    res.send(post);
  });
};

/* 
* GET about .
*/

exports.about = function (req, res) {
  res.render('about');
};