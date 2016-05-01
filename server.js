var net = require('net');
var jsonSocket = require('json-socket');
var mongoose = require('mongoose');

mongoose.connect("mongodb://mobile:mobile@ds019950.mlab.com:19950/mobileteam");
var db = mongoose.connection;
db.once("open", function() {
  console.log("DB connected");
});
db.on("error", function(err) {
  console.log("DB error : " + err);
});

var userSchema = mongoose.Schema({
  id: {type:String, required:true, unique:true},
  password: {type:String, required:true},
  role: {type:String, required:true},
  createdAt: {type:Date, default:Date.now}
});
var User = mongoose.model('user', userSchema);


/////////////////////////////////////////////////////////////

net.createServer(function(socket) {
  socket.on('data', function(data) {
    console.log(data.toString('utf8'));

    socket.write(data);
  });
}).listen(52273, function() {
  console.log('server on');
});
