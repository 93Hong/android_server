var net = require('net');

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

var c = mongoose.Schema({
    username : String,
    email : String
});
var C = mongoose.model('c', c);

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
    childs: [{
        username: String,
        email: String
    }],
    numOfChild: {
        type: Number,
        default: 0
    }
});
var Parent = mongoose.model('parent', parentSchema);

/*Child.findOne({name:"myData"}, function(err, data) {
  if (err) return console.log("Data error ", err);
  if (!data) {
    Child.create({name:"myData", count:0}, function (err, data) { // create variable
      if (err) return console.log("Data error ", err);
      console.log("Counter initialized ", data);
    });
  } else if (data) {
    console.log("Already exist :", data);
  }
});*/

/*Child.findOne({name: "myData"}, function(err, data) { // update
  data.count++;
  data.save(function (err) {
    if (err) console.log("Data error : ", err);
    else {
      console.log("Count increase ", data);
    }
  });
});*/

var clients = [];
var count = 0;
var messages = [];

// show server ip address
var interfaces = require('os').networkInterfaces();
for (var devName in interfaces) {
    var iface = interfaces[devName];
    for (var i = 0; i < iface.length; i++) {
        var alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
            console.log(alias.address);
    }
}

function create_id() {
    return count += 1;
}

/*setInterval(function() { // send ping
    for (i = 0; i < clients.length; i++) {
        var client = clients[i];

        var params = {};
        params.type = "ping";

        if (client.socket.write("data\n")) { //JSON.stringify(params) + '\n'
            console.log("ping send");
        } else {
            clients.splice(i, 1);
        }
    }
}, 1000);*/

/////////////////////////////////////////////////
// get db query //
/////////////////////////////////////////////////

/*function getChildQuery(name) {// multiple compare
  var query = Child.find({username:name});
  return query;
}*/

function getChildQuery(name) { // use for LOGIN child
    var query = Child.findOne({
        username: name
    });
    return query;
}

function getParentQuery(name) { // use for LOGIN parent
    var query = Parent.findOne({
        username: name
    });
    return query;
}

var server = net.createServer(function(socket) {
    console.log("#red[Client connected to the server with ip: " + socket.remoteAddress + "]");

    socket.on("error", function(error) {
        console.log("error" + error);
    });
    socket.on("close", function() {
        console.log("#red[Client has disconnected]");
    });

    socket.on("data", function(data) {
        try {
            var packet = JSON.parse(data);
            var query;
            ///////////////////////////////////////////////////////////////////////////
            // LOGIN // REGISTER //
            ///////////////////////////////////////////////////////////////////////////

            /*if (packet.type == "login") { // multiple compare
              var query =  getChildQuery(packet.username);
              query.exec(function(err, childs){
                if(err)
                  return console.log(err);
                childs.forEach(function(child){
                  if (packet.password == child.password) {
                    socket.write("Login ok\n" + childs + "\n");
                    return console.log(child.username, " login");
                  } else {
                    socket.write("Wrong password\n");
                    return console.log("Wrong password");
                  }
                });
              });
            }*/

            if (packet.type == "test") {
              socket.write(packet.content + '\n');
              return console.log(packet.content);
            }

            if (packet.type == "login") { // LOGIN

                if (packet.userType == "Child")
                    query = getChildQuery(packet.username);
                else if (packet.userType == "Parent")
                    query = getParentQuery(packet.username);
                query.exec(function(err, data) {
                    if (err) return console.log(err);
                    if (data === null) {
                        socket.write("1-2\n");//Wrong ID
                        return console.log("Wrong ID");
                    } else if (packet.password == data.password) {
                        socket.write("1-1\n");//Login ok
                        return console.log(data.username, " login");
                    } else {
                        socket.write("1-2\n");//Wrong password
                        return console.log("Wrong password");
                    }
                });
            }

            if (packet.type == "register") { // REGISTER
                /*var client = [];
                client.socket = socket;
                client.username = packet.username;
                client.password = packet.password;
                client.email = packet.email;
                client.clientID = create_id();
                //messages[packet.username] = [];
                clients.push(client);
                //var params = {};
                //params.type = "register";
                //params.clientID = client.clientID;*/
                socket.write(JSON.stringify(packet.type + " " + packet.username) + "\n"); // [object Object]\n

                ///////////////////////////  register in db
                if (packet.userType == "Child") {
                    getChildQuery(packet.username).exec(function(err, data) {
                        if (err) return console.log("Data error ", err);
                        if (!data) {
                            getParentQuery(packet.parentName).exec(function(err, data) {
                                if (data === null) {
                                    socket.write("2-2\n");//Wrong parent name
                                    return console.log("Wrong parent name");
                                }
                                Child.create({
                                    username: packet.username,
                                    password: packet.password,
                                    email: packet.email,
                                    parentName: packet.parentName,
                                    count: 0
                                },
                                function(err, data) { // create variable
                                    if (err) return console.log("Data error ", err);
                                    socket.write("2-1\n" + data + "\n");//User registered
                                    return console.log("User registered ", data);
                                });
                            });
                        } else if (data) {
                          socket.write("2-2\n" + data + "\n");//Already exist user
                            return console.log("Already exist user :", data);
                        }
                    });
                } else {
                    getParentQuery(packet.username).exec(function(err, data) {
                        if (err) return console.log("Data error ", err);
                        if (!data) {
                            Parent.create({
                                    username: packet.username,
                                    password: packet.password,
                                    email: packet.email,
                                    count: 0
                                },
                                function(err, data) { // create variable
                                    if (err) return console.log("Data error ", err);
                                    socket.write("2-1\n" + data + "\n");//User registered
                                    return console.log("User registered ", data);
                                });
                        } else if (data) {
                            socket.write("2-2\n" + data + "\n");//Already exist user
                            return console.log("Already exist user :", data);
                        }
                    });
                }
            }

            ///////////////////////////////////////////////////////////////////////////
            // LOGIN // REGISTER // END
            ///////////////////////////////////////////////////////////////////////////

            if (packet.type == "list") {
              getParentQuery(packet.username).exec(function(err, data) {
                if (data.numOfChild !== 0) {
                  socket.write(data.childs + "\n");
                  return console.log(data.childs);
                }
                else {
                  socket.write("There is not child\n");
                  return console.log("There is not child");
                }
              });
            }

            if (packet.type == "insertChild") {
              getParentQuery(packet.username).exec(function(err, data) {
                console.log(data);
                var num = data.numOfChild;
                //data.childs[num] = {username:packet.childName, email:packet.childEmail};
                data.numOfChild ++;
                //data.save();
                console.log(data);
                socket.write(packet.childName + " pushed\n");
                return console.log(packet.childName, " pushed");
              });
            }

            ///////////////////////////////////////////////////////////////////////////

            if (packet.type == "online") { // how are in online
                var params = {};
                var identifiers = [];

                for (i = 0; i < clients.length; i++) {
                    identifiers.push(clients[i].clientID);
                }

                params.type = "online";
                params.clients = identifiers;
                socket.write(JSON.stringify(params + '\n'));
            }

            if (packet.type == "message") {
                var client = packet.sender;
                var recipient = packet.recipient;

                for (i = 0; i < clients.length; i++) {
                    if (clients[i].clientID.toString() == recipient.toString()) {
                        var params = {};

                        params.type = "message";
                        params.sender = packet.sender;
                        params.recipient = packet.recipient;
                        params.message = packet.message;

                        clients[i].socket.write(JSON.stringify(params));

                        console.log("Wrote message " + params.message + " from sender " + params.sender + " to recipient " + recipient);
                        return;
                    }
                }
                console.log("Recipient was not valid");
            }
        } catch (e) {
            console.log("Else " + e.message);
        }
    });
});
server.listen(52273, function() {
    //'listening' listener
    console.log('Server is listening for incoming connections');
});
