// grab the things we need
var mongoose = require('mongoose');
//mongoose.connect('mongodb://hong:honghong@ds015962.mlab.com:15962/mobile');
mongoose.createConnection(process.env.MONGO_DB);

var Schema = mongoose.Schema;


var parentSchema = new Schema({
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
    childs: [{
        username: String,
        email: String
    }],
    numOfChild: {
        type: Number,
        default: 0
    }
});
var Parent = mongoose.model('Parent', parentSchema);

// make this available to our users in our Node applications
module.exports = Parent;
