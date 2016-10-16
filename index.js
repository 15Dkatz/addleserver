// TODO
// [] test endpoints with more than one word at a time. i.e. baseball%20cards || 'baseball cards'

// MODULES
var express = require('express');
var bodyParser = require('body-parser');
var fetch = require('node-fetch');
var store = require('app-store-scraper');

// API KEYS
var grepword_key = require('./secrets').grepword_key;

// APP
var app = express();
app.use(bodyParser.json());

app.get('/test', function(req, res) {
  res.json({test: "Working app"})
})


// **************************************************************
// OUR API
// **************************************************************

// usage:
// http://localhost:3000/keyword?keyword=baseball
app.get('/keyword', function(req, res) {
  var keyword = req.query.keyword;
  console.log('keyword: ', keyword);

  var request = 'http://api.grepwords.com/related?' + 'q=' + keyword + '&apikey=' + grepword_key;
  fetch(request)
    .then(function(res) {
      console.log('in fetch');
      return res.text();
    }).then(function(body) {
      // grepwords returns 100 related words by default but there is still a way to limit it.
      var related_words = JSON.parse(body);
      var new_body = {};
      new_body["keyword"] = keyword;
      new_body["related_words"] = related_words;
      res.json(new_body);
    })
})

// usage:
// http://localhost:3000/suggest?keyword=baseball
app.get('/suggest', function(req, res) {
  var keyword = req.query.keyword;
  console.log('keyword: ', keyword);

  // var request =
  store.suggest(keyword)
    .then(function(response) {
      console.log('res', response);
      res.json(response);
    })
    .catch(console.log);
})

// **************************************************************
// **************************************************************



var port = 3000;
console.log('listening on port', port);
app.listen(port);
