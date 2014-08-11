var mongoose = require('mongoose');
                                                                               
var locationPostSchema = new mongoose.Schema({ lat:       Number,
                                               lng:       Number,
                                               message:   String,
                                               signature: String,
                                               thumb:     Boolean,
                                               stars:     { type: Number, default: 1 },
											   flags:	  { type: Number, default: 0 },
                                               tag:       String,
                                               _reply_to: mongoose.Schema.ObjectId
                                             });

var LocationPost = mongoose.model('LocationPost', locationPostSchema);

exports.LocationPost = LocationPost;
exports.ObjectId = mongoose.Types.ObjectId;
                         
exports.findPostsWithinBox = function (box) {
  var query;
  // In case the bounding box covers the longitudinal boundary
  if (parseFloat(box[0][1]) < parseFloat(box[1][1]))
    query = LocationPost.find({lat: {$gt: box[0][0], $lt: box[1][0]}, 
                               lng: {$gt: box[0][1], $lt: box[1][1]}});
  else
    query = LocationPost.find({$or: [{lng: {$gt: box[0][1]}}, {lng: {$lt: box[1][1]}}], 
                               lat: {$gt: box[0][0], $lt: box[1][0]}});
  return query;
};