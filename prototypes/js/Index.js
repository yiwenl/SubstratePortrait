// Index.js
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

(function() {
	var random = function(min, max) { return min + Math.random() * ( max - min); }	
	var getRandomElement = function(ary) {	return ary[Math.floor(Math.random() * ary.length)]; }
	var W, H;

	Main = function() {
		this._init();
	}

	var p = Main.prototype;

	p._init = function() {
		this._canvas 	= document.createElement("canvas");
		this._canvas.width = window.innerWidth * 2;
		this._canvas.height = window.innerHeight * 2;
		document.body.appendChild(this._canvas);
		W = this._canvas.width;
		H = this._canvas.height;

		this._ctx = this._canvas.getContext('2d');
		this._bmp = new Bitmap(this._canvas);
		this._isStopped = false;
		this.lines = [];

		// ColourLovers.getRandomPalette(this, this._onColor);	
		window.addEventListener("keydown", this._onKey.bind(this));

		
		this.reset();
	};


	p.reset = function() {
		// ColourLovers.getRandomPalette(this, this._onColor);	
		this._onColor();
	};


	p._onColor = function(color) {
		this.lines = [];
		this._ctx.clearRect(0, 0, W, H);
		this._bmp = new Bitmap(this._canvas);
		this._isStopped = false;
		// console.log( "Get color from colour lover", color );
		this.colors = ColorThemes.getRandomTheme();
		console.log( this.colors );

		for(var i=0; i<5; i++) {
			// var line = new MarchingLines(vec3.create([random(0, W), random(0, H), 0]), vec3.create([random(-1, 1), random(-1, 1), 0]), color.colors[Math.floor(Math.random() * 5)], this._bmp);
			var line = new MarchingLines(vec3.create([random(0, W), random(0, H), 0]), vec3.create([random(-1, 1), random(-1, 1), 0]), this.colors[i], this._bmp);
			this.lines.push(line);	
		}

		if(this._efIndex == undefined) this._efIndex = scheduler.addEF(this, this.render, []);
	};


	p.render = function() {
		if(this._isStopped) return;

		for(var j=0; j<3; j++) {
			for(var i=0; i<this.lines.length;i++) {
				var line = this.lines[i];
				if(line.died) continue;
				line.walk();
				if(!line.checkHit()) line.draw();
				else {
					line.died = true;
					var newLines = line.getSpwanLines();
					for(var i=0; i<newLines.length; i++) {
						var line = new MarchingLines(newLines[i].v, newLines[i].d, this.colors[Math.floor(Math.random() * 5)], this._bmp);
						this.lines.push(line);	
					}
				}
			}
		}

		var len = this.lines.length;
		while(len--) {
			var l = this.lines[len];
			if(l.died) this.lines.splice(len, 1)
		}

		this._bmp.update();
	};


	p._onKey = function(e) {
		// console.log( e.keyCode );
		if(e.keyCode == 68) this.download();
	};



	p.download = function(e) {
		this._isStopped = true;
	    var dt = this._canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");;
	    // var dt = this._canvas.toDataURL("image/png");
    	window.location.href = dt;
    	window.location.download = "canvas.png";
    	// window.open(dt);
	};


	
})();