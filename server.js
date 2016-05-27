var net = require('net');
var mongoose = require('mongoose');
var HashMap = require('hashmap');
var gcm = require('node-gcm');
var fs = require('fs');
var schedule = require('node-schedule');
var moment = require('moment');

var a = new Date();

var today = moment().startOf('day'),
    yesterday = moment(today).add(-1, 'days');
now = moment();

var hour = parseInt("1") * -1;
var to = moment(now).add(hour, 'hours');
console.log(to.toDate());
console.log(now.toDate());

//console.log(now.format(), "     ", asd.format()); print moment

//mongoose.connect("mongodb://hong:honghong@ds015962.mlab.com:15962/mobile");
mongoose.connect(process.env.MONGO_DB); // encryption
var db = mongoose.connection;
db.once("open", function() {
    console.log("DB connected!");
});
db.on("error", function(err) {
    console.log("DB error : ", err);
});

/////////////////////////////////////////////////////////////
// DB QUERY //
/////////////////////////////////////////////////////////////
var subwaySchema = mongoose.Schema({
  subways: [{
    subway: String,
    line: String,
    xcoord: Number,
    ycoord: Number
  }]
});
var Subway = mongoose.model('subway', subwaySchema);
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
        speed: Number,
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
    },
    token: {
        type: String,
        required: true
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
    }],
    token: {
        type: String,
        required: true
    }
});
var Parent = mongoose.model('parent', parentSchema);

//  remove all locaton updated before today at 10 AM
var j = schedule.scheduleJob({
    hour: 10,
    minute: 0
}, function() {
    Child.update({}, {
        $pull: {
            "location": {
                createdAt: {
                    $lt: yesterday.toDate()
                }
            }
        }
    }, {
        multi: true
    }, function(err) {
        if (err) {
            return console.log(err);
        } else {
            return console.log("At 10 AM, clear childs location!!");
        }
    });
});

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
// TOKEN AND GCM //
/////////////////////////////////////////////////
var server_api_key = 'AIzaSyAH_oXjEPf7L0km8jr876wXnfmsgimVBrQ';
var sender = new gcm.Sender(server_api_key);
var registrationIds = [];

var message = new gcm.Message();

var message = new gcm.Message({
    collapseKey: 'demo',
    delayWhileIdle: true,
    timeToLive: 3,
    data: {
        title: 'saltfactory GCM demo',
        message: 'Google Cloud Messaging',
        desc: "설명입니다",
        custom_key1: 'custom data1',
        custom_key2: 'custom data2'
    }
});
/*
for (var i=0; i<push_ids.length; i++) { // 여러개보내기
     registrationIds.push(push_ids[i]);
}
*/
/////////////////////////////////////////////////

/////////////////////////////////////////////////
// get db query //
/////////////////////////////////////////////////

// enrol child to parent
function setChild(data) {
    Parent.update({
        username: data.parentName
    }, {
        $push: {
            "childs": {
                username: data.username,
                email: data.email
            }
        }
    }, {
        safe: true,
        upsert: true,
        new: true
    }, function(err) {
        if (err) {
            return console.log(err);
        } else {
            return console.log("Successfully added");
        }
    });
}

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

// Keep a pool of sockets ready for everyone
// Avoid dead sockets by responding to the 'end' event
//var sockets = [];
var onUser;
var map = new HashMap();

var server = net.createServer(function(socket) {
    console.log("#red[Client connected to the server with ip: " + socket.remoteAddress + "]");
    //sockets.push(socket); // sockets / sockets.write('\n');

    socket.on("error", function(error) {
        console.log("error" + error);
    });
    // Use splice to get rid of the socket that is ending. // client close
    // The 'close' event means tcp client has disconnected.
    socket.on("close", function() {

        //var i = sockets.indexOf(socket);
        //sockets.splice(i, 1);
        //console.log('length : ', sockets.length, ' id : ', i);
        map.remove(onUser);
        console.log("#red[Client has disconnected" + socket.remoteAddress + "]");
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

            if (packet.type == "start") {

                var s = "";
                Subway.find({}, function(err, data) {
                    //console.log(data[0].subways.length);
                    console.log(data[0].subways[1].subway);
                    for (var i = 0; i < data[0].subways.length; i++) {
                        //s += JSON.stringify(data[0].subways[i]);
                        //console.log(data[0].subways[i]);
                        //console.log(s);
                        s += data[0].subways[i].subway + '/' + data[0].subways[i].line + '/' + data[0].subways[i].xcoord + '/' + data[0].subways[i].ycoord + ':';
                    }
                    socket.write(s + '\n');
                    return console.log(s);
                });
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
                    } else if (packet.password == data.password) { // login ok
                        onUser = data.username;
                        map.set(data.username, socket); // map.get(data.username)

                        // Add the new client socket connection to the array of sockets // client on
                        //sockets.push(socket); // sockets / sockets.write('\n');
                        //console.log(sockets.length, " : ", packet.username);

                        socket.write("1-1\n");
                        return console.log("User ", data.username, " login");
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
                                        token: packet.token
                                    },
                                    function(err, data) { // create variable
                                        if (err) return console.log("Data error ", err);
                                        setChild(packet); // enrol child to parent
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
                                    token: packet.token
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
            // GET LIST // INSERT CHILDS //
            ///////////////////////////////////////////////////////////////////////////

            if (packet.type == "getList") {
                getParentQuery(packet.username).exec(function(err, data) {
                    var rtn = "3-2",
                        tmp = "token";
                    if (data.childs.length > 0) { // childs exist
                        rtn = "3-1/";
                        for (var i = 0; i < data.childs.length; i++) {
                            rtn = rtn + data.childs[i].username + "/"; //3-1name/name/name/
                            if (map.has(data.childs[i].username))
                                tmp += "o";
                            else
                                tmp += "x";
                        }
                        socket.write(rtn + tmp + '\n'); //3-1name/name/name/oxo
                    } else // childs not exist
                        socket.write('3-2\n');
                    return console.log(rtn, tmp);
                });
            }

            /*if (packet.type == "insertChild") { /////////////////// 보류
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
                        return console.log(err);
                    } else {
                        socket.write('Successfully added\n');
                        return console.log("Successfully added");
                    }
                });
            }*/

            ///////////////////////////////////////////////////////////////////////////
            // GET LIST // INSERT CHILDS // END
            ///////////////////////////////////////////////////////////////////////////

            ///////////////////////////////////////////////////////////////////////////
            // GET CHILD LOCATION // SET CHILD LOCATION // TRACE OF MOVEMENT //
            ///////////////////////////////////////////////////////////////////////////

            if (packet.type == "getLocation") {
                getChildQuery(packet.username).exec(function(err, data) {
                    if (err) return console.log("Data error ", err);
                    if (!data.location.length) {
                        socket.write('4-2/getLocation error\n');
                        return console.log('4-2/getLocation error');
                    }
                    if (!map.has(packet.username)) {
                        //var token = data.token;
                        //'eylbdJ_KUCo:APA91bHDT7ix0mOjb6sWoKJE5d6p7LNZVWmh3ACyZV3xPK2hcD35GDIV95NcGzh5Qox7R4PZLZrLwa_tiiFJjaXdvzgmhjDTbqRidujgci2Z9vEGtzHWW8EkeHW9pVK0uJTc6R63UvKV';
                        //registrationIds.push(token);

                        //sender.send(message, registrationIds, 4, function (err, result) {
                        //    console.log(result);
                        //});
                    }
                    var address = data.location.length - 1;
                    var lat = data.location[address].latitude;
                    var lng = data.location[address].longitude;
                    var spd = data.location[address].speed;
                    socket.write('4-1/' + data.username + '/' + lat + '/' + lng + '/' + spd + '\n'); // + query.createdAt
                    return console.log('4-1/', data.username, '/', lat, '/', lng, '/', spd);
                });
            }

            if (packet.type == "setLocation") {
                Child.update({
                    username: packet.username
                }, {
                    $push: {
                        "location": {
                            latitude: packet.lat,
                            longitude: packet.lng,
                            speed: packet.speed
                        }
                    }
                }, {
                    safe: true,
                    upsert: true,
                    new: true
                }, function(err) {
                    if (err) {
                        return console.log(err);
                    } else {
                        socket.write('Successfully added\n');
                        return console.log("Successfully added");
                    }
                });
            }

            ///////////////////////////////////////////////////////////////////////////
            // GET CHILD LOCATION // SET CHILD LOCATION // TRACE OF MOVEMENT // END
            ///////////////////////////////////////////////////////////////////////////

            ///////////////////////////////////////////////////////////////////////////
            // DANGER ZONE // TRACE //
            ///////////////////////////////////////////////////////////////////////////

            if (packet.type == "dangerZone") {
                if (map.has(packet.childName)) {
                    map.get(packet.childName).write("5-1/" + packet.lat + "/" + packet.lng + "/" + packet.radius + "\n");
                } else {
                    socket.write("Error : Child not active\n");
                    return console.log("Error : Child not active");
                }
                //sockets.forEach(function(entry) {
                //    if (entry.username == packet.username) {}
                //});
                //packet.lat packet.lng packet.childName packet.radius packet.isOn
            }

            if (packet.type == "getTrace") {

                var hour = parseInt(packet.time) * -1;
                var to = moment(now).add(hour, 'hours');
                console.log(packet);

                Child.find({
                    username: packet.childName,
                    "location.createdAt": {
                        $gte: to.toDate()
                    }
                }, function(err, data) {
                    if (err) {
                        socket.write("6-2\n");
                        return console.log(err);
                    }
                    if (!data | !data[0].location) {
                        console.log("6-2 No data");
                        return socket.write("6-2 No data\n");
                    }
                    var len = 0, i;
                    var rtn = "6-1/";
                    var arr = {};
                    for (i = 0; i < data[0].location.length; i++)
                        if (data[0].location[i].createdAt > to.toDate()) {
                            arr[len] = data[0].location[i];
                            len++;
                            console.log(data[0].location[i].createdAt);
                        }
                    if (len < 11) {
                        for (i = 0; i < len; i++) {
                            rtn += arr[i].latitude + '/' + arr[i].longitude + '/';
                            //rtn += data.location[i].latitude + ':' + data.location[i].longitude + '/';
                        }
                    } else {
                        for (i = 0; i < 10; i++) {
                            var incre = parseInt(len / 10) * i;
                            rtn += arr[incre].latitude + '/' + arr[incre].longitude + '/';
                        }
                    }
                    socket.write(rtn + '\n');
                    return console.log(rtn);
                });
            }

            ///////////////////////////////////////////////////////////////////////////
            // DANGER ZONE // TRACE // END
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
