//	LIBS
require("./libs/bongiovi-min.js");
var Scheduler = bongiovi.Scheduler;

//	IMPORTS
var Bitmap = require("./Bitmap.js");

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

		Scheduler.addEF(this, this.loop);
	};


	p.loop = function() {
	};


})();


new Main();