var net = require('net');

var clients = [];
var count = 0;

var messages = [];


var interfaces = require('os').networkInterfaces();
   for (var devName in interfaces) {
     var iface = interfaces[devName];  
    for (var i = 0; i < iface.length; i++) { 
      var alias = iface[i];
       if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) 
        console.log(alias.address);
     };
   };

function create_id() {
    return count += 1;
}

/*setInterval(function() {
    for (i = 0; i < clients.length; i++) {
        var client = clients[i];

        var params = {};
        params.type = "ping";

        if (client.socket.write(JSON.stringify(params) + '\n')) {
            console.log("ping send");
        } else {
            clients.splice(i, 1);
        }
    }
}, 1000);*/

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

            if (packet.type == "register") {
                var client = [];

                client.socket = socket;
                client.clientID = create_id();
                client.username = packet.username;

                messages[packet.username] = [];

                clients.push(client);

                var params = {};

                params.type = "register";
                params.clientID = client.clientID;

                socket.write(JSON.stringify(params + '\n')); // [object Object]\n

                console.log("Registered client : " + params.clientID + " user : " + packet.username);
            }

            if (packet.type == "online") {
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
