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
    createdAt: {
        type: Date,
        default: Date.now
    },
    count: Number
});
var Child = mongoose.model('child', childSchema);
/*
Child.findOne({name:"myData"}, function(err, data) {
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

/*setInterval(function() {
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

function getChildQuery(name) { // use for LOGIN
    var query = Child.findOne({
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

            /////////////////////////////////////////////
            // LOGIN // REGISTER //
            /////////////////////////////////////////////

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
            if (packet.type == "login") { // LOGIN
                var query = getChildQuery(packet.username);
                query.exec(function(err, child) {
                    if (err)
                        return console.log(err);
                    if (child == null) {
                        socket.write("Wrong ID\n");
                        return console.log("Wrong ID");
                    } else if (packet.password == child.password) {
                        socket.write("Login ok\n" + child + "\n");
                        return console.log(child.username, " login");
                    } else {
                        socket.write("Wrong password\n");
                        return console.log("Wrong password");
                    }
                });
            }

            if (packet.type == "register") { // REGISTER
                var client = [];
                client.socket = socket;
                client.username = packet.username;
                client.password = packet.password;
                client.email = packet.email;
                client.clientID = create_id();
                //messages[packet.username] = [];
                clients.push(client);
                //var params = {};
                //params.type = "register";
                //params.clientID = client.clientID;
                socket.write(JSON.stringify(packet.type + " " + client.username) + "\n"); // [object Object]\n

                ///////////////////////////  register in db

                Child.findOne({
                    username: client.username
                }, function(err, data) {
                    if (err) return console.log("Data error ", err);
                    if (!data) {
                        Child.create({
                                username: client.username,
                                password: client.password,
                                email: client.email,
                                count: 0
                            },
                            function(err, data) { // create variable
                                if (err) return console.log("Data error ", err);
                                console.log("User registered ", data);
                            });
                    } else if (data) {
                        console.log("Already exist user :", data);
                    }
                });
            }

            /////////////////////////////////////////////
            // LOGIN // REGISTER // END
            /////////////////////////////////////////////

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
var a = "123";
server.listen(52273, function() {
    //'listening' listener
    console.log('Server is listening for incoming connections');
});
