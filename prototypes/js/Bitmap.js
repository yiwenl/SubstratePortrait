// Bitmap.js

(function() {
	var W, H;
	Bitmap = function(canvas) {
		if(canvas) this.init(canvas);
	}

	var p = Bitmap.prototype;

	p.init = function(canvas) {
		this._canvas = canvas;
		this._ctx    = this._canvas.getContext('2d');
		W            = this._canvas.width;
		H            = this._canvas.height;
		this.width 	 = W;
		this.height  = H;

		console.log( W, H );
		this._bitmapData = this._ctx.getImageData(0, 0, W, H);

		return this;
	};


	p.getPixel = function(x, y) {
		var tx = Math.floor(x);
		var ty = Math.floor(y);
		var index = getIndex(tx, ty);

		return {
					r:this._bitmapData.data[index], 
					g:this._bitmapData.data[index+1], 
					b:this._bitmapData.data[index+2], 
					a:this._bitmapData.data[index+3]
				};
	};


	p.setPixel = function(x, y, r, g, b, a) {
		this.delaySetPixel(x, y, r, g, b, a);
		this._ctx.putImageData(this._bitmapData, 0, 0);
	};


	p.mixPixel = function(x, y, r, g, b, a) {
		this.delayMixPixel(x, y, r, g, b, a);
		this._ctx.putImageData(this._bitmapData, 0, 0);
	};


	p.delayMixPixel = function(x, y, r, g, b, a) {
		var pixel = this.getPixel(x, y);
		var na = a + pixel.a;
		var nr = a/255 * r + pixel.a/255 * pixel.r;
		var ng = a/255 * g + pixel.a/255 * pixel.g;
		var nb = a/255 * b + pixel.a/255 * pixel.b;

		this.delaySetPixel(x, y, nr, ng, nb, na);
	}


	p.delaySetPixel = function(x, y, r, g, b, a) {
		var tx = Math.floor(x);
		var ty = Math.floor(y);
		var index = getIndex(tx, ty);
		this._bitmapData.data[index  ] = r;
		this._bitmapData.data[index+1] = g;
		this._bitmapData.data[index+2] = b;
		this._bitmapData.data[index+3] = a;
	};


	p.update = function() {
		this._ctx.putImageData(this._bitmapData, 0, 0);	
	};


	var getIndex = function(x, y) {
		return (x + y * W) * 4;
	}


})();