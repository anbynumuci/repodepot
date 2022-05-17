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


	//set up websocket file server
	const{ Server } = require("socket.io");
	const io = new Server(app);

	io.on('connection', (socket) => {
		function serverLog (...messages){
			io.emit('log',['**** Message from the server:\n']);
			messages.forEach((item) => {
				io.emit('log',['****\t'+item]);
				console.log(item);
			});
		}


		serverLog('a page connected to the server: '+socket.id);

		socket.on('disconnect', () => {
			serverLog('a page disconnected from the server: '+socket.id);
		});
		/*join_room command handler*/
		socket.on('join_room', (payload) => {
			serverLog('Server recieved a command','\'join_room\'',JSON.stringify(payload));
			/*check data quality*/
			if ((typeof payload == 'undefined') || (payload === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a payload';
				socket.emit('join_room_response', response);
				serverLog('join_room command failed', JSON.stringify(response));
				return;
			}
			let room = payload.room;
			let username = payload.username;
			if ((typeof room == 'undefined') || (room === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a valid room';
				socket.emit('join_room_response', response);
				serverLog('join_room command failed', JSON.stringify(response));
				return;
			}
			if ((typeof username == 'undefined') || (username === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a valid username';
				socket.emit('join_room_response', response);
				serverLog('join_room command failed', JSON.stringify(response));
				return;
			}
			/*handle command*/
			socket.join(room);

			/*make sure client is in room */

			io.in(room).fetchSockets().then((sockets)=>{
				serverLog('There are '+sockets.length+' clients in the room, '+room);
				/*socket didnt join*/
				if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.includes(socket) ){
					response = {};
					response.result = 'fail';
					response.message = 'server internal error joining chat room';
					socket.emit('join_room_response', response);
					serverLog('join_room command failed', JSON.stringify(response));
				}
				/*socket joined room */
				else{
					response = {};
					response.result = 'success';
					response.room = room;
					response.username = username;
					response.count = sockets.length;
					/*tell everyone new user has joined */
					io.of('/').to(room).emit('join_room_response',response);
					serverLog('join_room succeeded ', JSON.stringify(response));
				}
			});
		});

		/* send chat message command handler */
		socket.on('send_chat_message', (payload) => {
			serverLog('Server recieved a command','\'send_chat_message\'',JSON.stringify(payload));
			/*check data quality*/
			if ((typeof payload == 'undefined') || (payload === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a payload';
				socket.emit('send_chat_message_response', response);
				serverLog('send_chat_message command failed', JSON.stringify(response));
				return;
			}
			let room = payload.room;
			let username = payload.username;
			let message = payload.message ;
			if ((typeof room == 'undefined') || (room === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a valid room to message';
				socket.emit('send_chat_message_response', response);
				serverLog('send_chat_message command failed', JSON.stringify(response));
				return;
			}
			if ((typeof username == 'undefined') || (username === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a valid username as a message source';
				socket.emit('send_chat_message_response', response);
				serverLog('send_chat_message command failed', JSON.stringify(response));
				return;
			}
			if ((typeof message == 'undefined') || (message === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a valid message ';
				socket.emit('send_chat_message_response', response);
				serverLog('send_chat_message command failed', JSON.stringify(response));
				return;
			}
			/*handle command*/
			let response = {};
			response.result = 'success';
			response.username = username;
			response.room = room;
			response.message = message;
			/*tell everyone what the message is */
			io.of('/').to(room).emit('send_chat_message_response', response);
			serverLog('send_chat_message command succeeded', JSON.stringify(response));
		});
	});
