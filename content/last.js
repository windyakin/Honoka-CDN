/*!
 *  last.js -- Get the last version of your GitHub repository release version.
 *  Copyright 2016 windyakin
 *  Licensed under the WTFPL
 *  Usage: $ bower install $(node -e "$(curl -fsSL https://cdn.honokak.osaka/last.js)" [USER] [REPOSNAME])
 */

'use strict';

var http = require('https');

var USER  = process.argv[1] || 'windyakin';
var REPOS = process.argv[2] || 'Honoka';

var options = {
	'host': 'api.github.com',
	'headers': {
		'user-agent': 'Mozilla/5.0 Honoka'
	},
	'port': 443,
	'method': 'GET',
	'path': '/repos/' + USER + '/' + REPOS + '/releases/latest'
};

http.get(options, function(res) {
	var body = '';
	res.on('data', function(chunk) {
		body += chunk;
	});
	res.on('end', function() {
		var json = JSON.parse(body);
		var tag  = json.tag_name;
		if ( tag === undefined ) {
			console.error('\x1b[31mERR!\x1b[0m ' + USER + '/' + REPOS + ' is not has tag_name');
			console.error('     ==> ' + json.message);
		}
		else {
			console.log(REPOS + '#' + tag);
		}
	});
}).on('error', function(e) {
	console.error('\x1b[31mERR!\x1b[0m ' + e);
});
