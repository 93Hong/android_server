// grab the things we need
var mongoose = require('mongoose');
//mongoose.connect('mongodb://hong:honghong@ds015962.mlab.com:15962/mobile');
mongoose.createConnection(process.env.MONGO_DB);

var Schema = mongoose.Schema;

var childSchema = new Schema({
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
    parentName: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    count: Number
});
var Child = mongoose.model('Child', childSchema);

// make this available to our users in our Node applications
module.exports = Child;
