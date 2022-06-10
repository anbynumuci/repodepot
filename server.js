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
const { fileURLToPath } = require('url');
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

		//playtoken 

		socket.on('play_token', (payload) =>{
			serverLog('Server recieved a command', '\'play_token\'',JSON.stringify(payload));
			/* verify data */
			if ((typeof payload == 'undefined') || (payload === null)){
				response = {};
				response.result = 'fail';
				response.message = 'client did not send a payload';
				socket.emit('play_token_response', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			let player = players[socket.id];
			if ((typeof player == 'undefined') || (player === null)){
				response = {};
				response.result = 'fail';
				response.message = 'play_taken came from an unregistered player';
				socket.emit('play_token_response', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			let username = player.username;
			if ((typeof username == 'undefined') || (username === null)){
				response = {};
				response.result = 'fail';
				response.message = 'play_taken came from an unregistered username';
				socket.emit('play_token', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			let game_id = player.room;
			if ((typeof game_id == 'undefined') || (game_id === null)){
				response = {};
				response.result = 'fail';
				response.message = 'no valid game associated with the play_token command';
				socket.emit('play_token', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			let row = payload.row;
			if ((typeof row == 'undefined') || (row === null)){
				response = {};
				response.result = 'fail';
				response.message = 'no valid row associated with play_token command';
				socket.emit('play_token_response', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			let column = payload.column;
			if ((typeof column == 'undefined') || (column === null)){
				response = {};
				response.result = 'fail';
				response.message = 'no valid column associated with play_token command';
				socket.emit('play_token_response', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			let color = payload.color;
			if ((typeof color == 'undefined') || (color === null)){
				response = {};
				response.result = 'fail';
				response.message = 'no valid color associated with play_token command';
				socket.emit('play_token_response', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			let game = games[game_id];
			if ((typeof game == 'undefined') || (game === null)){
				response = {};
				response.result = 'fail';
				response.message = 'no valid game associated with play_token command';
				socket.emit('play_token_response', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			if (color !== game.whose_turn){
				let response = {
					result: 'fail',
					message: 'play_token recieved the wrong color'
				}
				socket.emit('play_token_response',response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}
			if(
				((game.whose_turn === 'white') && (game.player_white.socket != socket.id)) || ((game.whose_turn === 'black') && (game.player_black.socket != socket.id))
			){
				let response = {
					result: 'fail',
					message: 'play_token played by the right color but wrong player',
				}
				socket.emit('play_token_response', response);
				serverLog('play_token command failed', JSON.stringify(response));
				return;
			}

			let response = {
				result: 'success'
			}
			socket.emit('play_token_response', response);

			/*execute */
			if(color === 'white') {
				game.board[row][column] = 'w';
				flip_tokens('w',row,column,game.board);
				game.whose_turn = 'black';
				game.legal_moves = calculate_legal_moves('b', game.board);
			}
			else if(color ==='black'){
				game.board[row][column] = 'b';
				flip_tokens('b',row,column,game.board);
				game.whose_turn = 'white';
				game.legal_moves = calculate_legal_moves('w', game.board);
			}

			let d = new Date();
			game.last_move_time = d.getTime();
			send_game_update(socket, game_id, 'played a token');
		});
	});

	//code for game state
	let games = [];

	function create_new_game() {
		let new_game = {};
		new_game.player_white = {};
		new_game.player_white.socket = "";
		new_game.player_white.username = "";
		new_game.player_black = {};
		new_game.player_black.socket = "";
		new_game.player_black.username = "";

		var d = new Date();
		new_game.last_move_time = d.getTime();

		new_game.whose_turn = 'black';
		new_game.board = [
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', 'w','b', ' ', ' ', ' '],
			[' ', ' ', ' ', 'b','w', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' ']
		];
		new_game.legal_moves = calculate_legal_moves('b', new_game.board);
		
		return new_game;
	}
	function check_line_match(color,dr,dc,r,c,board){
		if(board[r][c] === color){
			return true;
		}
		if(board[r][c] === ' '){
			return false;
		}
		if ((r + dr <0) || (r+dr > 7)){
			return false;
		}
		if ((c + dc <0) || (c+dc >7)){
			return false; 
		}
		return(check_line_match(color,dr,dc,r+dr,c+dc,board));
	}
	
	function adjacent_support(who,dr,dc,r,c,board){
		let other;
		if (who === 'b'){
			other = 'w';
		}
		else if (who === 'w'){
			other = 'b';
		}
		else{
			log("Problem:"+who);
			return false;
		}
		if ((r+dr < 0)||(r + dr >7)){
			return false;
		}
		if ((c+dc < 0)||(c + dc >7)){
			return false;
		}
		if(board[r+dr][c+dc] !== other){
			return false;
		}
		if ((r + dr + dr <0) || (r + dr + dr >7)){
			return false;
		}
		if ((c + dc + dc <0) || (c + dc + dc >7)){
			return false;
		}

		return check_line_match(who,dr,dc,r+dr+dr,c+dc+dc,board);
		
	}

	function calculate_legal_moves(who,board){
		let legal_moves = [
			[' ', ' ', ' ', ' ',' ', ' ', ' ',	 ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' '],
			[' ', ' ', ' ', ' ',' ', ' ', ' ', ' ']
		];
		for(let row=0; row <8; row++){
			for(let column=0; column <8; column++){
				if(board[row][column] === ' '){
					nw = adjacent_support(who,-1,1,row,column,board);
					ne = adjacent_support(who,-1,1,row,column,board);
					nn = adjacent_support(who,-1,0,row,column,board);
					ss = adjacent_support(who,1,0,row,column,board);
					sw = adjacent_support(who,1,-1,row,column,board);
					se = adjacent_support(who,1,1,row,column,board);
					ww = adjacent_support(who,0,-1,row,column,board);
					ee = adjacent_support(who,0,1,row,column,board);
					if(nw||nn||ne||ww||ee||sw||ss||se){
						legal_moves[row][column] = who;
					}
				}
			}
		}
		return legal_moves;
	}

	function flip_line(who,dr,dc,r,c,board){
		if ((r+dr < 0)||(r + dr >7)){
			return false;
		}
		if ((c+dc < 0)||(c + dc >7)){
			return false;
		}
		if (board[r+dr][c+dc] === ' '){
			return false;
		}
		if (board[r+dr][c+dc] === who){
			return true;
		}
		else {
			if(flip_line(who,dr,dc,r+dr,c+dc,board)){
				board[r+dr][c+dc] = who;
				return true;
			}
			else{
				return false; 
			}
		}
		
	}
	function flip_tokens(who, row, column, board){
		flip_line(who,-1,-1,row,column,board);
		flip_line(who,-1,1,row,column,board);
		flip_line(who,-1,0,row,column,board);
		flip_line(who,1,0,row,column,board);
		flip_line(who,1,-1,row,column,board);
		flip_line(who,1,1,row,column,board);
		flip_line(who,0,-1,row,column,board);
		flip_line(who,0,1,row,column,board);
	}


	function send_game_update(socket, game_id, message){
		//check for game with game_id
		if ((typeof games[game_id] == 'undefined') || (games[game_id] === null)){
			console.log('No game exists with game_id' + game_id + ". Making a new game for " + socket.id);
			games[game_id] = create_new_game()
		}
		//check if two people are in the game& assign color
		io.of('/').to(game_id).allSockets().then((sockets) => {

			const iterator = sockets[Symbol.iterator]();
			if(sockets.size >=1){
				let first = iterator.next().value;
				if((games[game_id].player_white.socket != first) && (games[game_id].player_black.socket != first)){
					//player doesnt have color
					if(games[game_id].player_white.socket === ""){
						//player should be white
						console.log("White is assigned to: "+first);
						games[game_id].player_white.socket = first;
						games[game_id].player_white.username = players[first].username;
					}
					else if (games[game_id].player_black.socket === ""){
						//player should be black 
						console.log("Black is assigned to: "+first);
						games[game_id].player_black.socket = first;
						games[game_id].player_black.username = players[first].username;
					}
					else{
						//kickout
						console.log("Kicking: "+ first + " out of game: "+ game_id);
						io.in(first).socketsLeave([game_id]);
					}
				}
			}


			if(sockets.size >= 2){
				let second = iterator.next().value;
				if((games[game_id].player_white.socket != second) && (games[game_id].player_black.socket != second)){
					if(games[game_id].player_white.socket === ""){
						console.log("white is assigned to: "+ second);
						games[game_id].player_white.socket = second; 
						games[game_id].player_white.username = players[second].username;
					}
					else if (games[game_id].player_black.socket === ""){
						//player should be black 
						console.log("Black is assigned to: "+second);
						games[game_id].player_black.socket = second;
						games[game_id].player_black.username = players[second].username;
					}
					else{
						//kickout
						console.log("Kicking: "+ second + " out of game: "+ game_id);
						io.in(second).socketsLeave([game_id]);
					}
				}
			}
			//send game update
			let payload = {
				result: 'success',
				game_id: game_id,
				game: games[game_id],
				message: message
			}
			io.of('/').to(game_id).emit('game_update', payload);
		})
		//check game over
		let legal_moves= 0;
		let whitesum = 0;
		let blacksum = 0;

		for (let row = 0; row<8; row++){
			for(let column=0; column<8; column++){
				if(games[game_id].board[row][column] != ' '){
					legal_moves++;
				}
				if(games[game_id].board[row][column] != 'w'){
					whitesum++;
				}
				if(games[game_id].board[row][column] != 'b'){
					blacksum++;
				}
			}
		}
		if(legal_moves === 0){
			let winner = "Tie Game";
			if (whitesum > blacksum){
				winner = 'white';
			}
			if (whitesum <blacksum){
				winner ="black";
			}
			let payload={
				result: 'success',
				game_id: game_id,
				game: games[game_id],
				who_won: winner
			}
			io.in(game_id).emit('game_over', payload);

			//delete old games
			setTimeout(
				((id)=> {
					return(() => {
						delete games[id];
					});
				})(game_id), 60*60*1000
			);
		}
	}