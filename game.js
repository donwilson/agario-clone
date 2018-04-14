	
	var canvas,
		context,
		connection,
		can_render = true,
		can_player_move = true,
		window_width = 0, window_height = 0,
		window_halfWidth = 0, window_halfHeight = 0,
		camera_position = {},
		camera_scale = 1.0,
		camera_scale_multiplier = 0.8,
		mouse_screenPosition = {'x': 0, 'x': 0},
		fastest_cell_speed = 250,   // fastest cell speed (in world_size per second) where cell.r = 1
		objects = {'cells': {}, 'pellets': {}},
		world_size = {'x': 5000, 'y': 5000},
		player_world_position = {'x': (world_size.x / 2), 'y': (world_size.y / 2)},
		player_speed_per_second = 30,
		player_object_id,
		angleFromPlayer = 0,
		distanceFromPlayer = 0,
		INPUT = {
			'SPACEBAR': 32,
			'ENTER': 13,
			'W': 119
		},
		input_active = {},
		game_fps = 0;
	
	// create canvas & context
	canvas = document.getElementById('screen');
	context = canvas.getContext('2d');
	
	
	function randomBetween(min, max) {
		return Math.floor(Math.random()*(max-min+1)+min);
	}
	
	function worldXToCameraX(x) {
		return (x - player_world_position.x);
	}
	
	function worldYToCameraY(y) {
		return (y - player_world_position.y);
	}
	
	function worldXYToCameraXY(x, y) {
		return {
			'x':	worldXToCameraX(x),
			'y':	worldYToCameraY(y)
		}
	}
	
	function calibrateCameraScale() {
		var player_radius = objects.cells[ player_object_id ].r,
			scaled_player_radius = (player_radius / camera_scale);
		
		console.log("Player Radius: "+ player_radius +" || Scaled Player Radius: "+ scaled_player_radius);
	}
	
	function calibrateCameraSize(cam_width, cam_height, offset_x, offset_y) {
		offset_x = offset_x || 0;
		offset_y = offset_y || 0;
		
		window_width = cam_width;
		window_height = cam_height;
		
		window_halfWidth = (window_width * 0.5);
		window_halfHeight = (window_height * 0.5);
		
		//canvas_el.attr({
		//	'width':	window_width,
		//	'height':	window_height
		//});
		
		canvas.width = window_width;
		canvas.height = window_height;
	}
	
	// [r, g, b]
	var colors = [
		[255, 130,   7],   // orange
		[255,   7, 139],   // magenta
		[254, 255,   0],   // yellow
		[  7, 255, 171],   // aquamarine
		[255,  14,   7],   // red
		[ 81, 255,   7],   // lime
		[  7, 191, 255],   // pale blue
		[  7, 133, 255],   // blue
		[205,   7, 255]   // purple
	];
	
	function chooseRandomColor() {
		return colors[ Math.floor(Math.random() * colors.length) ];
		//return [Math.floor(Math.random() * (255 - 0 + 1) + 0), Math.floor(Math.random() * (255 - 0 + 1) + 0), Math.floor(Math.random() * (255 - 0 + 1) + 0)]   // truly random color
	}
	
	function darkenColor(color) {
		var strokeDiff = 0.85;
		
		return [
			Math.max(0, Math.round( (color[0] * strokeDiff) )),
			Math.max(0, Math.round( (color[1] * strokeDiff) )),
			Math.max(0, Math.round( (color[2] * strokeDiff) ))
		];
	}
	
	
	
	
	
	/*** Pellets ***/
	
		function Pellet() {
			this.refreshPosition();
			this.refreshColor();
			this.refreshDisplay();
		}
		
		Pellet.prototype = {
			'x':			0,
			'y':			0,
			'r':			0,
			'color':		"",
			'lineWidth':	10,
			'angle':		0,
			'num_points':	6,
			'lastAngleChg':	0,   // time in seconds since last collision with player check
			'chgAngleAftr':	1,   // number of seconds when to change angle of display rotation
			
			'refreshPosition': function(x, y, r) {
				//this.r = r || randomBetween(1, 2);
				this.r = r || 1;
				
				this.x = x || randomBetween((this.r + this.lineWidth), (world_size.x - (this.r + this.lineWidth)));
				this.y = r || randomBetween((this.r + this.lineWidth), (world_size.y - (this.r + this.lineWidth)));
			},
			
			'refreshDisplay': function(change_color) {
				this.angle = randomBetween(0, 359);
				this.num_points = randomBetween(8, 9);
				this.chgAngleAftr = randomBetween(1, 5);
			},
			
			'refreshColor': function() {
				var newColor = chooseRandomColor();
				
				this.color = "rgb("+ newColor.join(",") +")";
			},
			
			'update': function(dt) {
				var dx, dy, distance;
				
				// Cell v Pellet collision
				if(objects.cells[ player_object_id ].subcells.length > 1) {
					// multiple player cells to check
					var subcell_x, subcell_y;
					
					for(var j = 0, k = objects.cells[ player_object_id ].subcells.length; j < k; j++) {
						subcell_x = (objects.cells[ player_object_id ].x + (Math.cos(objects.cells[ player_object_id ].subcells[ j ][1]) * objects.cells[ player_object_id ].subcells[ j ][2]));
						subcell_y = (objects.cells[ player_object_id ].y + (Math.sin(objects.cells[ player_object_id ].subcells[ j ][1]) * objects.cells[ player_object_id ].subcells[ j ][2]));
						
						dx = (subcell_x - this.x),   // (x1 - x2)
						dy = (subcell_y - this.y),
						distance = Math.sqrt( ((dx * dx) + (dy * dy)) );
						
						if((distance < ((objects.cells[ player_object_id ].r * (objects.cells[ player_object_id ].subcells[ j ][0] / 100)) + objects.cells[ player_object_id ].lineWidth))) {
							var consumed_amount = this.r,
								old_cell_r = objects.cells[ player_object_id ].r;
							
							objects.cells[ player_object_id ].subcellConsumeMass(j, consumed_amount);
							
							this.consume();
							
							break;
						}
					}
				} else {
					// quick check against single player cell
					dx = (objects.cells[ player_object_id ].x - this.x),   // (x1 - x2)
					dy = (objects.cells[ player_object_id ].y - this.y),
					distance = Math.sqrt( ((dx * dx) + (dy * dy)) );
					
					if((distance < (objects.cells[ player_object_id ].r + objects.cells[ player_object_id ].lineWidth))) {
						objects.cells[ player_object_id ].consumeMass( this.r );
						
						this.consume();
					}
				}
				
				// working (non-subcell version):
				//var dx, dy, distance;
				//dx = (objects.cells[ player_object_id ].x - this.x),   // (x1 - x2)
				//dy = (objects.cells[ player_object_id ].y - this.y),
				//distance = Math.sqrt( ((dx * dx) + (dy * dy)) );
				//
				//if((distance < (objects.cells[ player_object_id ].r + objects.cells[ player_object_id ].lineWidth))) {
				//	objects.cells[ player_object_id ].r += (this.consume() / 2);
				//}
				
				this.lastAngleChg += dt;
			},
			
			'draw': function() {
				context.save();
				
				context.translate(worldXToCameraX(this.x), worldYToCameraY(this.y));
				
				if(this.lastAngleChg >= this.chgAngleAftr) {
					this.refreshDisplay();
					
					this.lastAngleChg = 0;
				}
				
				context.rotate((this.angle * (Math.PI / 180)));
				
				var per_point = (360 / (this.num_points + 1));
				
				context.beginPath();
				context.moveTo((this.r + this.lineWidth), 0);
				
				var angle_rad, next_x, nexy_y;
				
				for(var i = 1; i <= this.num_points; i++) {
					angle_rad = (Math.PI * ((per_point * i) / 180));
					next_x = ((this.r + this.lineWidth) * Math.cos(angle_rad));
					next_y = ((this.r + this.lineWidth) * Math.sin(angle_rad));
					
					context.lineTo(
						next_x,
						next_y
					);
				}
				
				context.closePath();
				
				context.fillStyle = this.color;
				context.fill();
				
				context.restore();
				
				
				// WORKING, PERFECT CIRCLE:
				//context.beginPath();
				//context.arc(worldXToCameraX(this.x), worldYToCameraY(this.y), this.r, 0, (Math.PI * 2));
				//context.lineWidth = this.lineWidth;
				//context.strokeStyle = this.color;
				//context.stroke();
				//context.fillStyle = this.color;
				//context.fill();
			},
			
			'consume': function() {
				// pellet is being consumed, move pellet elsewhere in world and return size of pellet
				this.refreshPosition();
				this.refreshColor();
				this.refreshDisplay();
				
				return this.r;
			}
		};
	
	
	/*** Cells ***/
	
		function Cell(x, y, radius, name) {
			var newFillColor = chooseRandomColor();
			var newStrokeColor = darkenColor(newFillColor);
			
			this.x = x;
			this.y = y;
			this.r = radius;
			this.fillColor = "rgb("+ newFillColor.join(",") +")";
			this.strokeColor = "rgb("+ newStrokeColor.join(",") +")";
			this.name = name;
			
			//console.log("New Cell ("+ this.name +") at ("+ this.x +", "+ this.y +")");
		}
		
		Cell.prototype = {
			'x':				0,   // world position on x-axis (0-world_size.x)
			'mx':				0,   // movement amount ratio on X-axis (0-1)
			'y':				0,   // world position on y-axis (0-world_size.y)
			'my':				0,   // movement amount ratio on Y-axis (0-1)
			'r':				0,   // radius in pixels at camera_scale=1.0
			'rMin':				15,   // minimum radius size of cell
			'fillColor':		"",
			'strokeColor':		"",
			'lineWidth':		5,
			'name':				"",
			'decreaseTime':		0,   // time (in seconds) since last size decrease
			'decreaseAfter':	5,   // time (in seconds) between size decrease interval
			'subcells':			[[100, 0, 0]],   // array of subcells (subcell = [0: size in percent, 1: angle from subcell center to player center, 2: distance from subcell center to player center])
			'maxSubcells':		16,
			
			// game logic //
			'update': function(dt) {
				// movement
				if((this.mx != 0) || (this.my != 0)) {
					//var speed = (((fastest_cell_speed * this.r) - 1)/this.r);   // way wrong
					//var speed = 0.01;
					var speed = (fastest_cell_speed * (20 / (this.r + this.lineWidth)));
					
					if(this.mx != 0) {
						this.x += (this.mx * speed * dt);
						
						this.x = Math.max(this.r, Math.min((world_size.x - this.r), this.x));
					}
					
					if(this.my != 0) {
						this.y += (this.my * speed * dt);
						
						this.y = Math.max(this.r, Math.min((world_size.y - this.r), this.y));
					}
					
					// reset movement
					this.mx = 0;
					this.my = 0;
				}
				
				// size decrease over time
				this.decreaseTime += dt;
				
				if(this.decreaseTime >= this.decreaseAfter) {
					var decreaseTimes = Math.floor( (this.decreaseTime / this.decreaseAfter) ),
						decreaseAmount = 1;   // percentage of cell size to decrease each interval, minimum=1 with overall radius minimum of .rMin
					
					// change decrease amount percentage based on size
					if(this.r > 1000) {
						decreaseAmount = 5;
					} else if(this.r > 250) {
						decreaseAmount = 3;
					}
					
					this.decreaseTime %= this.decreaseAfter;
					
					
					
					for(var i = 1; i <= decreaseTimes; i++) {
						this.r = (this.r * ((100 - decreaseAmount) / 100));
						
						if(this.r < this.rMin) {
							this.r = this.rMin;
							
							break;
						}
					}
				}
			},
			
			'draw': function() {
				// subcell version
				var numSubcells = this.subcells.length || 1;
				
				if(numSubcells > 1) {
					var cell_radius_one_percent = (this.r * (1 / 100));
					
					for(var j = 0, k = this.subcells.length; j < k; j++) {
						context.beginPath();
						
						context.arc(
							(worldXToCameraX(this.x) + ( Math.cos(this.subcells[ j ][1]) * this.subcells[ j ][2] )),
							(worldYToCameraY(this.y) + ( Math.sin(this.subcells[ j ][1]) * this.subcells[ j ][2] )),
							(cell_radius_one_percent * this.subcells[j][0]),
							0,
							(2 * Math.PI)
						);
						
						context.strokeStyle = this.strokeColor;
						context.lineWidth = this.lineWidth;
						context.stroke();
						context.fillStyle = this.fillColor;
						context.fill();
					}
				} else {
					// 100% cell, simple straight forward draw
					
					// working (non-subcell version):
					context.beginPath();
					context.arc(worldXToCameraX(this.x), worldYToCameraY(this.y), this.r, 0, (2 * Math.PI));
					context.strokeStyle = this.strokeColor;
					context.lineWidth = this.lineWidth;
					context.stroke();
					context.fillStyle = this.fillColor;
					context.fill();
				}
			},
			
			
			// actions //
			
			'consumeMass': function(amount) {
				this.r += amount;
				
				return this.r;
			},
			
			'subcellConsumeMass': function(i, amount) {
				// subcell not found, just consume mass
				if(this.subcells[ i ] == undefined) {
					return this.consumeMass(amount);
				}
				
				var old_cell_r = this.r,
					new_cell_r = this.consumeMass(amount);
				
				// recalculate subcell percentages
				var old_one_percent_r = (old_cell_r * (1 / 100)),
					new_one_percent_r = (new_cell_r * (1 / 100));
				
				for(var j = 0, k = this.subcells.length; j < k; j++) {
					subcell_mass_amount = (this.subcells[ j ][0] * old_one_percent_r);
					
					if(j == i) {
						// increase percentage of subcell relative to consumption
						subcell_mass_amount += amount;
					}
					
					// adjust percentage of subcell according to updated cell radius in relation to subcell mass
					this.subcells[ j ][0] = ((subcell_mass_amount / new_cell_r) * 100);
				}
				
				return this.r;
			},
			
			'shootAt': function(angle) {
				// shoot pellet at angle
				
			},
			
			'splitAt': function(angle) {
				var curNumSubcells = this.subcells.length || 1;
				
				// need enough mass to split at least one subcell, checks against num subcells + 1
				if(this.r < (this.rMin * (curNumSubcells + 1))) {
					// cell too small, unable to split
					//console.log("Too small to split");
					
					return;
				}
				
				var newNumSubcells = Math.min(this.maxSubcells, (curNumSubcells * 2));
				
				for(var j = 0, k = this.subcells.length; j < k; j++) {
					if((this.r * (this.subcells[ j ][0] / 100)) < (this.rMin * 2)) {
						// too small to split this subcell, skip
						//console.log("too small to split ("+ (this.r * (this.subcells[ j ][0] / 100)) +") this subcell (reqd: "+ (this.rMin * 2) +"), skip");
						
						continue;
					}
					
					var reduced_subcell_percent = (this.subcells[ j ][0] / 2);
					
					this.subcells[ j ][0] = reduced_subcell_percent;
					
					// create new subcell
					var new_subcell_distance = 100;   // tmp - just random number
					this.subcells[ this.subcells.length ] = [ reduced_subcell_percent, angle, new_subcell_distance ];
					  
					//console.log("Subcell @ "+ j +": "+ this.subcells[ j ][0]);
					//console.log("New subcell @ "+ this.subcells.length +": "+ this.subcells[ (this.subcells.length - 1) ][0]);
					
					if(this.subcells.length >= this.maxSubcells) {
						break;
					}
				}
				
				//console.log("Split "+ curNumSubcells +" subcell(s) into "+ this.subcells.length +" towards "+ angle);
				//console.log(this.subcells);
			}
		};
	
	
	function draw_grid() {
		var grid_size = 20;
		
		// save context before translating context
		context.save();
		
		context.translate(((window_halfWidth / camera_scale) * -1), ((window_halfHeight / camera_scale) * -1));
		
		var scaled_canvas_width = (window_width / camera_scale);
		var scaled_canvas_height = (window_height / camera_scale);
		
		var grid_start_x = 0;
		var grid_start_y = 0;
		
		// camera dimensions
		grid_start_x -= ( ( (window_halfWidth / camera_scale) * -1 ) % grid_size );
		grid_start_y -= ( ( (window_halfHeight / camera_scale) * -1 ) % grid_size );
		
		// world offset
		grid_start_x -= ( ( worldXToCameraX(camera_position.x) * -1 ) % grid_size );
		grid_start_y -= ( ( worldYToCameraY(camera_position.y) * -1 ) % grid_size );
		
		// todo: add start_x/y offset based on (window_half[Width/Height] % (grid_size / camera_zoom))
		
		context.beginPath();
		context.lineWidth = 1;
		context.strokeStyle = "#dee6ea";
		
		for(var grid_x = grid_start_x; grid_x <= scaled_canvas_width; grid_x += grid_size) {
			context.moveTo(grid_x, 0);
			context.lineTo(grid_x, scaled_canvas_height);
		}
		
		for(var grid_y = grid_start_y; grid_y <= scaled_canvas_height; grid_y += grid_size) {
			context.moveTo(0, grid_y);
			context.lineTo(scaled_canvas_width, grid_y);
		}
		
		context.stroke();
		
		context.restore();
	}
	
	function draw_leaderboard() {
		
	}
	
	function draw_player_score() {
		var playerScoreText = "Score: "+ Math.floor(objects.cells[ player_object_id ].r),
			fontSize = 18 / camera_scale,
			windowPadding = 12 / camera_scale,
			boxPadding = 6 / camera_scale;
		
		// maybe calculate fontSize further here?
		// keep to even numbers, preferably divisible by 4
		
		
		
		// fontSize-contexted padding
		//windowPadding = (fontSize / 2);
		//boxPadding = (fontSize / 4);
		
		
		context.save();
		
		//context.translate( windowPadding, (window_height - (windowPadding - boxPadding - fontSize - boxPadding)) );
		
		context.scale(1, 1);
		context.translate( (( (window_halfWidth / camera_scale) * -1 ) + windowPadding ), ((window_halfHeight / camera_scale) - (windowPadding + boxPadding + fontSize + boxPadding)) );
		//context.translate( (( window_halfWidth * -1 ) + windowPadding ), window_halfHeight );
		
		// setup font context
		context.font = "normal "+ fontSize +"pt Verdana";
		
		var textMetrics = context.measureText(playerScoreText);
		
		// draw text container box
		context.beginPath();
		
		context.rect(0, 0, (boxPadding + textMetrics.width + boxPadding), (boxPadding + fontSize + boxPadding));
		context.fillStyle = "rgba(0, 0, 0, 0.3)";
		context.fill();
		
		
		// draw text
		context.fillStyle = "#ffffff";
		context.textAlign = "left";
		context.textBaseline = "hanging";
		context.fillText(playerScoreText, boxPadding, boxPadding);
		
		
		context.restore();
	}
	
	function draw_game_fps() {
		var playerScoreText = Math.floor(game_fps) +" FPS",
			fontSize = 12 / camera_scale,
			windowPadding = 6 / camera_scale,
			boxPadding = 6 / camera_scale;
		
		context.save();
		
		//context.translate( windowPadding, (window_height - (windowPadding - boxPadding - fontSize - boxPadding)) );
		
		context.scale(1, 1);
		context.translate( (( (window_halfWidth / camera_scale) * -1 ) + windowPadding ), (((window_halfHeight / camera_scale) * -1) + windowPadding ) );
		//context.translate( (( window_halfWidth * -1 ) + windowPadding ), window_halfHeight );
		
		// setup font context
		context.font = "normal "+ fontSize +"pt Verdana";
		
		var textMetrics = context.measureText(playerScoreText);
		
		// draw text container box
		context.beginPath();
		
		context.rect(0, 0, (boxPadding + textMetrics.width + boxPadding), (boxPadding + fontSize + boxPadding));
		context.fillStyle = "rgba(0, 0, 0, 0.3)";
		context.fill();
		
		
		// draw text
		context.fillStyle = "#ffffff";
		context.textAlign = "left";
		context.textBaseline = "hanging";
		context.fillText(playerScoreText, boxPadding, boxPadding);
		
		
		context.restore();
	}
	
	function draw_world_border() {
		context.save();
		
		context.translate(
			worldXToCameraX(0),
			worldYToCameraY(0)
		);
		
		context.beginPath();
		context.lineWidth = 4;
		context.strokeStyle = "#000000";
		context.moveTo(0, 0);
		context.lineTo(0, world_size.y);
		context.lineTo(world_size.x, world_size.y);
		context.lineTo(world_size.x, 0);
		context.closePath();
		context.stroke();
		
		context.restore();
	}
	
	
	/*** Game Logic ***/
	
		function update(dt) {
			//console.log("mouse_screenPosition = "+ mouse_screenPosition.x +"x"+ mouse_screenPosition.y);
			
			if(can_player_move && (distanceFromPlayer >= (objects.cells[ player_object_id ].r * 0.75))) {
				objects.cells[ player_object_id ].mx = Math.cos(angleFromPlayer);
				objects.cells[ player_object_id ].my = Math.sin(angleFromPlayer);
			}
			
			// update cells
			for(var obj in objects.cells) {
				objects.cells[ obj ].update(dt);
			}
			
			// update pellets
			for(var obj in objects.pellets) {
				objects.pellets[ obj ].update(dt);
			}
			
			// move camera to player
			player_world_position.x = objects.cells[ player_object_id ].x;
			player_world_position.y = objects.cells[ player_object_id ].y;
			
			camera_position = worldXYToCameraXY(player_world_position.x, player_world_position.y);
		}
		
		function draw() {
			context.clearRect(0, 0, canvas.width, canvas.height);
			
			context.save();
			
			//console.log(camera_position);
			
			context.translate((camera_position.x + window_halfWidth), (camera_position.y + window_halfHeight));
			context.scale(camera_scale, camera_scale);
			
			// draw grid
			draw_grid();
			
			// draw game border
			draw_world_border();
			
			// draw pellets
			for(var obj in objects.pellets) {
				objects.pellets[ obj ].draw();
			}
			
			
			// draw cells
			for(var obj in objects.cells) {
				objects.cells[ obj ].draw();
			}
			
			// draw leaderboard
			draw_leaderboard();
			
			// draw player score
			draw_player_score();
			
			// draw fps
			draw_game_fps();
			
			context.restore();
		}
	
	
	var loop__time = new Date().getTime();
	var fps = 0, last_fps = 0;
	
	function game_loop() {
		var now = new Date().getTime(),
			dt = ((now - loop__time) / 1000);
		
		window.requestAnimationFrame(game_loop);
		
		fps += 1;
		last_fps += dt;
		
		if(last_fps > 1) {
			//console.log("FPS: "+ fps);
			game_fps = fps;
			
			fps = 0;
			last_fps %= 1;
		}
		
		loop__time = now;
		
		if(can_render) {
			// update logic
			update(dt);
			
			// draw
			draw();
		}
	}
	
	
	
	
	
	
	
	
	jQuery(document).ready(function($) {
		var canvas_el = $("#screen");
		
		// create player
		player_object_id = Math.floor((Math.random() * 10000));
		player_object_id = player_object_id.toString();
		
		//objects[ player_object_id ] = new Cell(500, 500, 15, prompt("Name?"));
		objects.cells[ player_object_id ] = new Cell(player_world_position.x, player_world_position.y, 15, "Don_"+ player_object_id);
		
		
		// set camera position on player
		camera_position = worldXYToCameraXY(player_world_position.x, player_world_position.y);
		
		// create pellets
		for(var i = 0; i < 1000; i++) {
			objects.pellets[ i ] = new Pellet();
		}
		
		
		$(window).on({
			'load': function() {
				calibrateCameraSize($(window).width(), $(window).height());
			},
			'resize': function() {
				calibrateCameraSize($(window).width(), $(window).height());
			},
			'focus': function() {
				// browser gains focus
				
				//// enable game rendering
				//can_render = true;
				
				// refresh input status
				input_active = {};
				
				// calibrate window size just in case
				//calibrateCameraSize($(window).width(), $(window).height());
			},
			'blur': function() {
				// browser loses focus
				
				//// disable game rendering
				//can_render = false;
			}
		});
		
		// mouse movement
		$(document).on('mousemove', function(e) {
			mouse_screenPosition.x = e.pageX;
			mouse_screenPosition.y = e.pageY;
			
			
			// calculate angle between player and pointer
			var playerPos = worldXYToCameraXY(objects.cells[ player_object_id ].x, objects.cells[ player_object_id ].y);
			
			angleFromPlayer = Math.atan2(
				(mouse_screenPosition.y - window_halfHeight),   // y2 - y1
				(mouse_screenPosition.x - window_halfWidth)   // x2 - x1
			);
			
			// calculate distance between player and pointer
			var dx = (window_halfWidth - mouse_screenPosition.x);   // (x1 - x2);
			var dy = (window_halfHeight - mouse_screenPosition.y);   // (y1 - y2);
			
			distanceFromPlayer = (Math.sqrt( ((dx * dx) + (dy * dy)) ) / camera_scale);
			//Phaser.Math.distance((game.camera.width/2), (game.camera.height/2), x, y);
			
			//objects.cells[ player_object_id ].mx = Math.cos(angleFromPlayer);
			//objects.cells[ player_object_id ].my = Math.sin(angleFromPlayer);
			
			//move_x = (this._cameraSpeed * Math.cos(this._angleFromPlayer) * speedMultiplier);
			//move_y = (this._cameraSpeed * Math.sin(this._angleFromPlayer) * speedMultiplier);
		});
		
		// capture middle click
		$(document).on('mousedown', function(e) {
			if(e.which == 1) {
				//can_render = !can_render;
			} else if(e.which == 2) {
				// middle click: reset zoom
				e.preventDefault();
				
				camera_scale = 1;
			} else if(e.which == 3) {
				
			}
		});
		
		// capture keydown
		$(document).on('keydown', function(e) {
			// prevent repeated key calls
			if(input_active[ e.which ] === false) {
				return;
			}
			
			input_active[ e.which ] = false;
			
			if(e.which == INPUT.W) {
				// w
				// shoot partial pellet
				
				console.log("Pressed W :: Shoot Player Pellet");
				
				objects.cells[ player_object_id ].shootAt(angleFromPlayer);
			} else if(e.which == INPUT.SPACEBAR) {
				// spacebar
				// split player cell(s) into halved cells
				
				console.log("Pressed Spacebar :: Split Player");
				
				objects.cells[ player_object_id ].splitAt(angleFromPlayer);
			} else if(e.which == INPUT.ENTER) {
				// enter
				// toggle player movement
				
				console.log("Pressed Enter :: Toggling Player Movement");
				
				can_player_move = !can_player_move;
			}
		});
		
		// release input status
		$(document).on('keyup', function(e) {
			input_active[ e.which ] = true;
		});
		
		
		
		// scroll to zoom
		$('body').on('DOMMouseScroll mousewheel', function(e) {
			if(e.originalEvent.detail > 0 || e.originalEvent.wheelDelta < 0 ) {
				// zoom out
				//camera_zoom = Math.max(1, (camera_zoom - 0.01));
				camera_scale *= camera_scale_multiplier;
			} else {
				// zoom in
				//camera_zoom = Math.min(5, (camera_zoom + 0.01));
				camera_scale /= camera_scale_multiplier;
			}
			
			//camera_scale = (Math.round((camera_scale * 10)) / 10);
			
			
			// calibrate camera_scale to player radius size
			calibrateCameraScale();
		});
		
		
		/*
			connection = new WebSocket("ws://"+window.location.hostname+":9008");
			
			connection.onopen = function() {
				console.log("Connection opened");
				connection.send(nickname);
				
				document.getElementById("form").onsubmit = function (event) {
					var msg = document.getElementById("msg");
					
					if(msg.value) {
						connection.send(msg.value)
					}
					
					msg.value = "";
					
					event.preventDefault();
				}	;
			};
			
			connection.onclose = function() {
				console.log("Connection closed");
			};
			
			connection.onerror = function() {
				console.error("Connection error");
			};
			
			connection.onmessage = function (event) {
				var div = document.createElement("div");
				div.textContent = event.data;
				
				document.body.appendChild(div);
			};
		*/
		
		
		// start game
		game_loop();
	});
	