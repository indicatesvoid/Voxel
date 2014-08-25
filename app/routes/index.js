var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

// dumb hello world shit
router.get('/helloworld', function(req, res) {
	res.render('helloworld', { title: 'Hello wurld.' });
});

module.exports = router;
