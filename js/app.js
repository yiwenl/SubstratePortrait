//	LIBS
require("./libs/bongiovi-min.js");
var Scheduler = bongiovi.Scheduler;
var ImgLoader = bongiovi.SimpleImageLoader;
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

		ImgLoader.load(["assets/01.jpg", "assets/02.jpg", "assets/03.jpg"], this, this._onImageLoaded)
	};


	p._onImageLoaded = function(img) {
		console.log("Image Loaded : ", img);

		var image = img["01"];
		console.log(image);
		var W = window.innerWidth * 2;
		var H = window.innerHeight * 2;

		var sx = W / image.width;
		var sy = H / image.height;
		var scale = Math.max(sx, sy);
		var tx = (W - image.width * scale) * .5;
		var ty = (H - image.height * scale) * .5;

		this.imgCanvas = document.createElement("canvas");
		this.imgCanvas.width = W;
		this.imgCanvas.height = H;
		this.ctxImgCanvas = this.imgCanvas.getContext("2d");
		this.ctxImgCanvas.drawImage(image, 0, 0, image.width, image.height, tx, ty, image.width*scale, image.height*scale);
		this.pixels = new Bitmap(this.imgCanvas);

		this.canvas = document.createElement("canvas");
		this.canvas.width = W;
		this.canvas.height = H;
		this.canvas.className = "substrate-canvas";
		this.ctx = this.canvas.getContext("2d");
		document.body.appendChild(this.canvas);

		this.canvasExport = document.createElement("canvas");
		this.canvasExport.width = W;
		this.canvasExport.height = H;
		this.canvasExport.className = "substrate-canvas";
		this.ctxExport = this.canvas.getContext("2d");

		this.bmp = new Bitmap(this.canvas);
		console.log(this.bmp);
		console.log(this.pixels);
		this._isStopped = false;

		this.lines = [];

		for(var i=0; i<5; i++) {
			var line = new MarchingLine(vec3.fromValues(random(0, W), random(0, H), 0), vec3.fromValues(random(-1, 1), random(-1, 1), 0), null, this.bmp, this.pixels);
			this.lines.push(line);	
		}

		// this.btnSave = document.body.querySelector(".save");
		// this.btnSave.addEventListener("click", this.save.bind(this));

		Scheduler.addEF(this, this.loop);
	};


	p.save = function() {
		this.bmp.update();
		this.ctxExport.fillStyle = "#fff";
		this.ctxExport.fillRect(0, 0, this.canvasExport.width, this.canvasExport.height);
		this.ctxExport.drawImage(this.canvas, 0, 0);
		var dt = this.canvasExport.toDataURL('image/jpeg');
		this.btnSave.href = dt;
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
						var nl = new MarchingLine(newLines[i].v, newLines[i].d, null, this.bmp, this.pixels);
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

		// this.ctx.globalCompositeOperation = "source-in";
		// this.ctx.drawImage(this.imgCanvas, 0, 0);
		// this.ctx.globalCompositeOperation = "source-over";
	};


})();


new Main();