//set up static file server
let static = require('node-static');

//http server
let http = require('http');

//assume heroku
let port = process.env.PORT;
let directory = __dirname + '/public';

if ((typeof port == 'undefined') || (port === null)){
	port = 8080;
	directory = './public'
}

let file = new static.Server(directory);


let app = http.createServer(
	function(request, response){
		request.addListener('end',
			function(){
				file.serve(request,response);
			}).resume();
	}).listen(port);

console.log('the server is running');
