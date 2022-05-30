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

	// set up registry of player info
	let players = [];
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
					players[socket.id] = {
						username: username,
						room: room
					}
					//announce to everyone who is in the room to everyone
					for (const member of sockets){
						response = {
							result: 'success',
							socket_id: member.id,
							room: players[member.id].room,
							username: players[member.id].username,
							count: sockets.length,
						}
					/*tell everyone new user has joined */
					io.of('/').to(room).emit('join_room_response',response);
					serverLog('join_room succeeded ', JSON.stringify(response));
					
					if(room !== "Lobby"){
						send_game_update(socket,room,'initial update');
					}
					}
				}
			});
		});



		socket.on('invite', (payload) => {
			serverLog('Server recieved a command','\'invite\'',JSON.stringify(payload));
			/*check data quality*/
			if ((typeof payload == 'undefined') || (payload === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a payload';
				socket.emit('invite_response', response);
				serverLog('invite command failed', JSON.stringify(response));
				return;
			}

			let requested_user = payload.requested_user;
			let room = players[socket.id].room;
			let username = players[socket.id].username;
			if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")){
				response = {
					result: 'fail',
					message: 'Client did not request a valid user to invite to play'
				}
				socket.emit('invite_response', response);
				serverLog('invite command failed', JSON.stringify(response));
				return;
			}
			if ((typeof room == 'undefined') || (room === null) || (room === "")){
				response = {
					result: 'fail',
					message: 'User invited isnt in a room'
				}
				socket.emit('invite_response', response);
				serverLog('invite command failed', JSON.stringify(response));
				return;
			}
			if ((typeof username == 'undefined') || (username === null) || (username === "")){
				response = {
					result: 'fail',
					message: 'User invited doesnt have a name registered'
				}
				socket.emit('invite_response', response);
				serverLog('invite command failed', JSON.stringify(response));
				return;
			}


			/*make sure client is in room */

			io.in(room).allSockets().then((sockets)=>{
				serverLog('There are '+sockets.length+' clients in the room, '+room);
				//invitee isnt in room
				if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.has(requested_user) ){
					response = {
						result: 'fail',
						message: 'user that was invited is no longer in the room'
					}
					socket.emit('invite_response', response);
					serverLog('invite command failed', JSON.stringify(response));
				}
				/*invitee is in the room */
				else{
					response = {
						result: 'success',
						socket_id: requested_user
					}
					socket.emit("invite_response", response);

					response = {
						result : 'success',
						socket_id: socket.id
					}
					socket.to(requested_user).emit("invited", response);
					serverLog('invite command succeeded', JSON.stringify(response));
				}
			});
		});

		//uninvited
		socket.on('uninvite', (payload) => {
			serverLog('Server recieved a command','\'uninvite\'',JSON.stringify(payload));
			/*check data quality*/
			if ((typeof payload == 'undefined') || (payload === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a payload';
				socket.emit('uninvited', response);
				serverLog('uninvite command failed', JSON.stringify(response));
				return;
			}

			let requested_user = payload.requested_user;
			let room = players[socket.id].room;
			let username = players[socket.id].username;
			if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")){
				response = {
					result: 'fail',
					message: 'Client did not request a valid user to uninvite'
				}
				socket.emit('uninvited', response);
				serverLog('uninvite command failed', JSON.stringify(response));
				return;
			}
			if ((typeof room == 'undefined') || (room === null) || (room === "")){
				response = {
					result: 'fail',
					message: 'User uninvited isnt in a room'
				}
				socket.emit('uninvited', response);
				serverLog('uninvite command failed', JSON.stringify(response));
				return;
			}
			if ((typeof username == 'undefined') || (username === null) || (username === "")){
				response = {
					result: 'fail',
					message: 'User invited doesnt have a name registered'
				}
				socket.emit('uninvited', response);
				serverLog('uninvite command failed', JSON.stringify(response));
				return;
			}


			/*make sure client is in room */

			io.in(room).allSockets().then((sockets)=>{
				serverLog('There are '+sockets.length+' clients in the room, '+room);
				//uninvitee isnt in room
				if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.has(requested_user) ){
					response = {
						result: 'fail',
						message: 'user that was uninvited is no longer in the room'
					}
					socket.emit('uninvited', response);
					serverLog('uninvite command failed', JSON.stringify(response));
				}
				/*uninvitee is in the room */
				else{
					response = {
						result: 'success',
						socket_id: requested_user
					}
					socket.emit("uninvited", response);

					response = {
						result : "success",
						socket_id: socket.id
					}
					socket.to(requested_user).emit("uninvited", response);
					serverLog('uninvite command succeeded', JSON.stringify(response));
				}
			});
		});
		
		//game start
		socket.on('game_start', (payload) => {
			serverLog('Server recieved a command','\'game_start\'',JSON.stringify(payload));
			/*check data quality*/
			if ((typeof payload == 'undefined') || (payload === null)){
				response = {};
				response.result = 'fail';
				response.message = 'CLient did not send a payload';
				socket.emit('game_start_response', response);
				serverLog('game start command failed', JSON.stringify(response));
				return;
			}

			let requested_user = payload.requested_user;
			let room = players[socket.id].room;
			let username = players[socket.id].username;
			if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")){
				response = {
					result: 'fail',
					message: 'Client did not request a valid user to engage in play'
				}
				socket.emit('game_start_response', response);
				serverLog('game start command failed', JSON.stringify(response));
				return;
			}
			if ((typeof room == 'undefined') || (room === null) || (room === "")){
				response = {
					result: 'fail',
					message: 'User that was engaged to play isnt in a room'
				}
				socket.emit('game_start_response', response);
				serverLog('game_start command failed', JSON.stringify(response));
				return;
			}
			if ((typeof username == 'undefined') || (username === null) || (username === "")){
				response = {
					result: 'fail',
					message: 'User that was engaged to play doesnt have a name registered'
				}
				socket.emit('game_start_response', response);
				serverLog('game_start command failed', JSON.stringify(response));
				return;
			}


			/*make sure client is in room */

			io.in(room).allSockets().then((sockets)=>{
				serverLog('There are '+sockets.length+' clients in the room, '+room);
				//engaged player isnt in room
				if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.has(requested_user) ){
					response = {
						result: 'fail',
						message: 'user that was engaged to play is no longer in the room'
					}
					socket.emit('game_start_response', response);
					serverLog('game_start command failed', JSON.stringify(response));
					return;
				}
				/*engaged player is in the room */
				else{
					let game_id = Math.floor(1+ Math.random() * 0x100000).toString(16);
					response = {
						result: 'success',
						game_id: game_id,
						socket_id: requested_user
					}
					socket.emit("game_start_response", response);
					socket.to(requested_user).emit("game_start_response", response);
					serverLog('game_start command succeeded', JSON.stringify(response));
				}
			});
		});

	//disconnect
	socket.on('disconnect', () => {
		serverLog('a page disconnected from the server: '+socket.id);
		if((typeof players[socket.id] != 'undefined') && (players[socket.id] != null)){
			let payload = {
				username: players[socket.id].username,
				room: players[socket.id].room,
				count: Object.keys(players).length -1,
				socket_id: socket.id
			};
			let room = players[socket.id].room;
			delete players[socket.id];
			//tell everyone who left
			io.of("/").to(room).emit('player_disconnected', payload);
			serverLog('player_disconnected succeeded ',JSON.stringify(payload));
		}
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