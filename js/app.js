//	LIBS
require("./libs/bongiovi-min.js");
var Scheduler = bongiovi.Scheduler;
var random = function(min, max) { return min + Math.random() * ( max - min); }	

//	IMPORTS
var Bitmap = require("./Bitmap.js");
var MarchingLine = require("./MarchingLine.js");

(function() {
	Main = function() {
		this._init();
	}

	var p = Main.prototype;

	p._init = function() {
		if(!document.body) {
			Scheduler.next(this, this._init);
			return;
		}

		this.canvas = document.createElement("canvas");
		this.canvas.width = window.innerWidth * 2;
		this.canvas.height = window.innerHeight * 2;
		this.canvas.className = "substrate-canvas";
		this.ctx = this.canvas.getContext("2d");
		document.body.appendChild(this.canvas);

		this.bmp = new Bitmap(this.canvas);
		console.log(this.bmp);
		this._isStopped = false;

		this.lines = [];

		for(var i=0; i<5; i++) {
			var line = new MarchingLine(vec3.fromValues(random(0, W), random(0, H), 0), vec3.fromValues(random(-1, 1), random(-1, 1), 0), null, this.bmp);
			this.lines.push(line);	
		}

		Scheduler.addEF(this, this.loop);
	};


	p.loop = function() {
		if(this.lines.length == 0) return;
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
						var nl = new MarchingLine(newLines[i].v, newLines[i].d, null, this.bmp);
						this.lines.push(nl);	
					}
				}
			}
		}

		var len = this.lines.length;
		while(len--) {
			var l = this.lines[len];
			if(l.died) 	this.lines.splice(len, 1)
		}


		this.bmp.update();
	};


})();


new Main();