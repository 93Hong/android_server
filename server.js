var express = require('express');

var app = express();

app.get('/', function(req, res) {
  res.send('hello world');
});

app.listen(52273, function() {
  console.log('server on');
});
