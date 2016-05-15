var net = require('net');

var mongoose = require('mongoose');

//mongoose.connect("mongodb://hong:honghong@ds015962.mlab.com:15962/mobile");
mongoose.connect(process.env.MONGO_DB);
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
    location: [{
        latitude: Number,
        longitude: Number,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    parentName: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
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
    }]
});
var Parent = mongoose.model('parent', parentSchema);

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
                        socket.write("1-2\n"); //Wrong ID
                        return console.log("Wrong ID");
                    } else if (packet.password == data.password) {
                        socket.write("1-1\n"); //Login ok
                        return console.log(data.username, " login");
                    } else {
                        socket.write("1-2\n"); //Wrong password
                        return console.log("Wrong password");
                    }
                });
            }

            if (packet.type == "register") { // REGISTER
                socket.write(JSON.stringify(packet.type + " " + packet.username) + "\n"); // [object Object]\n

                ///////////////////////////  register in db
                if (packet.userType == "Child") {
                    getChildQuery(packet.username).exec(function(err, data) {
                        if (err) return console.log("Data error ", err);
                        if (!data) {
                            getParentQuery(packet.parentName).exec(function(err, data) {
                                if (data === null) {
                                    socket.write("2-2\n"); //Wrong parent name
                                    return console.log("Wrong parent name");
                                }
                                Child.create({
                                        username: packet.username,
                                        password: packet.password,
                                        email: packet.email,
                                        parentName: packet.parentName,
                                    },
                                    function(err, data) { // create variable
                                        if (err) return console.log("Data error ", err);
                                        socket.write("2-1\n" + data + "\n"); //User registered
                                        return console.log("User registered ", data);
                                    });
                            });
                        } else if (data) {
                            socket.write("2-2\n" + data + "\n"); //Already exist user
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
                                },
                                function(err, data) { // create variable
                                    if (err) return console.log("Data error ", err);
                                    socket.write("2-1\n" + data + "\n"); //User registered
                                    return console.log("User registered ", data);
                                });
                        } else if (data) {
                            socket.write("2-2\n" + data + "\n"); //Already exist user
                            return console.log("Already exist user :", data);
                        }
                    });
                }
            }

            ///////////////////////////////////////////////////////////////////////////
            // LOGIN // REGISTER // END
            ///////////////////////////////////////////////////////////////////////////

            ///////////////////////////////////////////////////////////////////////////
            // LIST // INSERT CHILDS //
            ///////////////////////////////////////////////////////////////////////////

            if (packet.type == "list") {
                getParentQuery(packet.username).exec(function(err, data) {
                    var rtn = "3-2";
                    if (data.childs.length > 0) { // childs exist
                        rtn = "3-1";
                        for (var i = 0; i < data.childs.length; i++)
                            rtn = rtn + data.childs[i].username + "/"; //3-1name/name/name
                        socket.write(rtn + '\n');
                    } else // childs not exist
                        socket.write('3-2\n');
                    return console.log(rtn);
                });
            }

            if (packet.type == "insertChild") {
                Parent.update({
                    username: packet.username
                }, {
                    $push: {
                        "childs": {
                            username: packet.childName,
                            email: packet.childEmail
                        }
                    }
                }, {
                    safe: true, upsert: true, new : true
                }, function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Successfully added");
                        socket.write('Successfully added\n');
                    }
                });
            }

            ///////////////////////////////////////////////////////////////////////////
            // LIST // INSERT CHILDS // END
            ///////////////////////////////////////////////////////////////////////////

            ///////////////////////////////////////////////////////////////////////////
            // GET CHILD LOCATION // SET CHILD LOCATION //
            ///////////////////////////////////////////////////////////////////////////

            if (packet.type == "getLocation") {
                getChildQuery(packet.username).exec(function(err, data) {
                    if (err) return console.log("Data error ", err);
                    if (!data.location.length) {
                      socket.write('getLocation error\n');
                      return console.log('getLocation error');
                    }
                    var address = data.location.length - 1;
                    var lat = data.location[address].latitude;
                    var lng = data.location[address].longitude;
                    console.log(data.username + '/' + lat + '/' + lng);
                    socket.write(data.username + '/' + lat + '/' + lng + '\n'); // + query.createdAt
                });
            }

            if (packet.type == "setLocation") {
              Child.update({
                  username: packet.username
              }, {
                  $push: {
                      "location": {
                          latitude: packet.lat,
                          longitude: packet.lng
                      }
                  }
              }, {
                  safe: true, upsert: true, new : true
              }, function(err) {
                  if (err) {
                      console.log(err);
                  } else {
                      console.log("Successfully added");
                      socket.write('Successfully added\n');
                  }
              });
            }

            ///////////////////////////////////////////////////////////////////////////
            // GET CHILD LOCATION // SET CHILD LOCATION // END
            ///////////////////////////////////////////////////////////////////////////

        } catch (e) {
            console.log("Else " + e.message);
        }
    });
});
server.listen(52273, function() {
    //'listening' listener
    console.log('Server is listening for incoming connections');
});
