var mongoose = require('mongoose');

mongoose.connect("mongodb://hong:honghong@ds015962.mlab.com:15962/mobile");
//mongoose.connect(process.env.MONGO_DB);
var db = mongoose.connection;
db.once("open", function() {
    console.log("DB connected!");
});
db.on("error", function(err) {
    console.log("DB error : ", err);
});

var childSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    location: {
      latitude: String,
      longitude: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    count: Number
});
var Child = mongoose.model('child', childSchema);

var parentSchema = mongoose.Schema({
  username: {
      type: String,
      required: true,
      unique: true
  },
  password: {
      type: String,
      required: true
  },
  email: {
      type: String,
      required: true,
      unique: true
  },
  createdAt: {
      type: Date,
      default: Date.now
  },
  childs: {
    name: String,
    email: String
  },
  numOfChild: {
    type: Number,
    default: 0
  }
});
var Parent = mongoose.model('parent', parentSchema);
module.exports = Child;
