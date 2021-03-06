(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./Bitmap.js":2,"./MarchingLine.js":3,"./libs/bongiovi-min.js":4}],2:[function(require,module,exports){
// Bitmap.js

function Bitmap(canvas) {
	if(!canvas) return;

	this.init(canvas);
}


var p = Bitmap.prototype;
p.constructor = Bitmap;

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

p.darkenPixel = function(x, y, r, g, b, a) {
	var pixel = this.getPixel(x, y);

	var na = a + pixel.a;
	var nr = 255 - a + r * na/255;
	var ng = 255 - a + g * na/255;
	var nb = 255 - a + b * na/255;

	this.delaySetPixel(x, y, nr, ng, nb, na);
};


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


module.exports = Bitmap;
},{}],3:[function(require,module,exports){
// MarchingLine.js
var random = function(min, max) { return min + Math.random() * ( max - min); }	
var hexToRgb = function(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}
var MIN_SPWAN_WIDTH = 40;

function MarchingLine(pos, dir, color, bmp, pixels) {
	this.pos      = pos;
	this.startPos = vec3.clone(this.pos);
	this.dir      = dir;
	this.color    = hexToRgb(color);
	this.color    = {r:0, g:0, b:0};
	this.pixels   = pixels;

	this.speed    = vec3.clone(dir);
	this.bmp      = bmp;
	vec3.normalize(this.speed, this.speed);
	// vec3.scale(this.speed, 1);
	this.lastX    = 0;
	this.lastY    = 0;
	this.died	  = false;


	this.seed = Math.random() * 0xFFFF;
	var m = mat4.create();
	mat4.identity(m);
	var theta = Math.random() > .5 ? Math.PI*.5 : -Math.PI*.5;
	mat4.rotateZ(m, m, theta);
	this.shadows = vec3.clone(this.dir);
	// mat4.multiplyVec3(m, this.shadows);
	vec3.transformMat4(this.shadows, this.shadows, m);
	vec3.normalize(this.shadows, this.shadows);
}


var p = MarchingLine.prototype;
p.constructor = MarchingLine;

p.walk = function() {
	vec3.add(this.pos, this.pos, this.speed);	
};


p.draw = function() {
	this.bmp.delaySetPixel(this.pos[0], this.pos[1], this.color.r, this.color.g, this.color.b, 255);

	//	DRAW SHADOWS
	var noiseOffset = .005;
	var noiseRange = 300;
	var noise = Perlin.noise(this.pos[0]*noiseOffset, this.pos[1]*noiseOffset, this.seed);


	noise *= noiseRange;
	var shadowOffset = .1;
	var n = vec3.create();
	for(var i=1; i<noise; i++) {
		vec3.scale(n, this.shadows, i);
		vec3.add(n, n, this.pos);
		var alpha = (1 - Math.sin(i/noise * Math.PI * .5)) * 50;
		if(this.bmp.getPixel(n[0], n[1]).a != 255) {
			var pixel = this.pixels.getPixel(n[0], n[1]);

			if(this.bmp.getPixel(n[0], n[1]).a < 255 - pixel.r) {
				this.bmp.delayMixPixel(n[0], n[1], pixel.r, pixel.g, pixel.b, alpha);
				// this.bmp.darkenPixel(n[0], n[1], pixel.r, pixel.g, pixel.b, alpha);
			}
		}
			
	}
};


p.checkHit = function() {
	var x = Math.floor(this.pos[0]);
	var y = Math.floor(this.pos[1]);

	if(x == this.lastX && y == this.lastY) return false;
	this.lastX = x;
	this.lastY = y;
	if(x < 0 || y < 0) return true;
	if(x >= this.bmp.width || y > this.bmp.height) return true;

	var pixel = this.bmp.getPixel(x, y);
	if(pixel.a == 255) return true;
	return false;
};


p.getSpwanLines = function() {
	var diff = vec3.subtract(this.pos, this.pos, this.startPos);
	if(vec3.length(diff) < MIN_SPWAN_WIDTH) return [];

	var v1 = vec3.create();
	vec3.scale(v1, diff, random(.2, .8));
	vec3.add(v1, v1, this.startPos);

	var v2 = vec3.create();
	vec3.scale(v2, diff, random(.2, .8));
	vec3.add(v2, v2, this.startPos);


	var m = mat4.create();
	var thetaOffset = .05;
	mat4.identity(m);
	var theta = Math.random() > .5 ? random(-thetaOffset, thetaOffset) + Math.PI*.5 : random(-thetaOffset, thetaOffset) - Math.PI*.5;
	mat4.rotateZ(m, m, theta);
	var d1 = vec3.clone(this.dir);
	vec3.transformMat4(d1, d1, m);

	mat4.identity(m);
	var theta = Math.random() > .5 ? random(-thetaOffset, thetaOffset) + Math.PI*.5 : random(-thetaOffset, thetaOffset) - Math.PI*.5;
	mat4.rotateZ(m, m, theta);
	var d2 = vec3.clone(this.dir);
	vec3.transformMat4(d2, d2, m);


	return [{v:v1, d:d1}, {v:v2, d:d2}];
};

module.exports = MarchingLine;
},{}],4:[function(require,module,exports){
!function t(i,e,s){function r(n,a){if(!e[n]){if(!i[n]){var h="function"==typeof require&&require;if(!a&&h)return h(n,!0);if(o)return o(n,!0);var u=new Error("Cannot find module '"+n+"'");throw u.code="MODULE_NOT_FOUND",u}var f=e[n]={exports:{}};i[n][0].call(f.exports,function(t){var e=i[n][1][t];return r(e?e:t)},f,f.exports,t,i,e,s)}return e[n].exports}for(var o="function"==typeof require&&require,n=0;n<s.length;n++)r(s[n]);return r}({1:[function(t){console.log("Library bongiovi V1.0.0");t("../../js/bongiovi/Scheduler.js"),t("../../js/bongiovi/SimpleImageLoader.js"),t("../../js/bongiovi/GLTool.js"),t("../../js/bongiovi/SceneRotation.js"),t("../../js/bongiovi/Scene.js"),t("../../js/bongiovi/Camera.js"),t("../../js/bongiovi/CameraPerspective.js"),t("../../js/bongiovi/Mesh.js"),t("../../js/bongiovi/GLShader.js"),t("../../js/bongiovi/GLTexture.js"),t("../../js/bongiovi/View.js"),t("../../js/bongiovi/ViewCopy.js"),t("../../js/bongiovi/FrameBuffer.js"),t("../../js/bongiovi/Pass.js"),t("../../js/bongiovi/EffectComposer.js")},{"../../js/bongiovi/Camera.js":2,"../../js/bongiovi/CameraPerspective.js":3,"../../js/bongiovi/EffectComposer.js":4,"../../js/bongiovi/FrameBuffer.js":5,"../../js/bongiovi/GLShader.js":6,"../../js/bongiovi/GLTexture.js":7,"../../js/bongiovi/GLTool.js":8,"../../js/bongiovi/Mesh.js":9,"../../js/bongiovi/Pass.js":10,"../../js/bongiovi/Scene.js":11,"../../js/bongiovi/SceneRotation.js":12,"../../js/bongiovi/Scheduler.js":13,"../../js/bongiovi/SimpleImageLoader.js":14,"../../js/bongiovi/View.js":15,"../../js/bongiovi/ViewCopy.js":16}],2:[function(){bongiovi=window.bongiovi||{},function(){var t=function(){this.matrix=mat4.create(),mat4.identity(this.matrix)},i=t.prototype;i.lookAt=function(t,i,e){mat4.identity(this.matrix),mat4.lookAt(this.matrix,t,i,e)},i.getMatrix=function(){return this.matrix},bongiovi.Camera=t}()},{}],3:[function(){bongiovi=window.bongiovi||{},function(){{var t=bongiovi.Camera,i=function(){t.call(this),this.projection=mat4.create(),mat4.identity(this.projection),this.mtxFinal=mat4.create()},e=i.prototype=new t;t.prototype}e.setPerspective=function(t,i,e,s){mat4.perspective(this.projection,t,i,e,s)},e.getMatrix=function(){return mat4.multiply(this.mtxFinal,this.projection,this.matrix),this.mtxFinal},bongiovi.CameraPerspective=i}()},{}],4:[function(){!function(){{var t=function(){this.texture,this._passes=[]},i=t.prototype=new bongiovi.Pass;bongiovi.Pass.prototype}i.addPass=function(t){this._passes.push(t)},i.render=function(t){this.texture=t;for(var i=0;i<this._passes.length;i++)this.texture=this._passes[i].render(this.texture);return this.texture},i.getTexture=function(){return this.texture},bongiovi.EffectComposer=t}()},{}],5:[function(){!function(){var t,i=bongiovi.GLTexture,e=function(t){return!(0==t||t&t-1)},s=function(i,s,r){t=bongiovi.GLTool.gl,r=r||{},this.width=i,this.height=s,this.magFilter=r.magFilter||t.LINEAR,this.minFilter=r.minFilter||t.LINEAR_MIPMAP_NEAREST,this.wrapS=r.wrapS||t.MIRRORED_REPEAT,this.wrapT=r.wrapT||t.MIRRORED_REPEAT,e(i)&&e(s)||(this.wrapS=this.wrapT=t.CLAMP_TO_EDGE,this.minFilter==t.LINEAR_MIPMAP_NEAREST&&(this.minFilter=t.LINEAR)),this._init()},r=s.prototype;r._init=function(){this.depthTextureExt=t.getExtension("WEBKIT_WEBGL_depth_texture"),this.texture=t.createTexture(),this.depthTexture=t.createTexture(),this.glTexture=new i(this.texture,!0),this.glDepthTexture=new i(this.depthTexture,!0),this.frameBuffer=t.createFramebuffer(),t.bindFramebuffer(t.FRAMEBUFFER,this.frameBuffer),this.frameBuffer.width=this.width,this.frameBuffer.height=this.height;this.width;if(t.bindTexture(t.TEXTURE_2D,this.texture),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,this.magFilter),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,this.minFilter),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),this.magFilter==t.NEAREST&&this.minFilter==t.NEAREST?t.texImage2D(t.TEXTURE_2D,0,t.RGBA,this.frameBuffer.width,this.frameBuffer.height,0,t.RGBA,t.FLOAT,null):t.texImage2D(t.TEXTURE_2D,0,t.RGBA,this.frameBuffer.width,this.frameBuffer.height,0,t.RGBA,t.UNSIGNED_BYTE,null),this.minFilter==t.LINEAR_MIPMAP_NEAREST&&t.generateMipmap(t.TEXTURE_2D),t.bindTexture(t.TEXTURE_2D,this.depthTexture),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),null!=this.depthTextureExt&&t.texImage2D(t.TEXTURE_2D,0,t.DEPTH_COMPONENT,this.width,this.height,0,t.DEPTH_COMPONENT,t.UNSIGNED_SHORT,null),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,this.texture,0),null==this.depthTextureExt){console.log("no depth texture");var e=t.createRenderbuffer();t.bindRenderbuffer(t.RENDERBUFFER,e),t.renderbufferStorage(t.RENDERBUFFER,t.DEPTH_COMPONENT16,this.frameBuffer.width,this.frameBuffer.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.RENDERBUFFER,e)}else t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,this.depthTexture,0);t.bindTexture(t.TEXTURE_2D,null),t.bindRenderbuffer(t.RENDERBUFFER,null),t.bindFramebuffer(t.FRAMEBUFFER,null)},r.bind=function(){t.bindFramebuffer(t.FRAMEBUFFER,this.frameBuffer)},r.unbind=function(){t.bindFramebuffer(t.FRAMEBUFFER,null)},r.getTexture=function(){return this.glTexture},r.getDepthTexture=function(){return this.glDepthTexture},bongiovi.FrameBuffer=s}()},{}],6:[function(){!function(){var t=function(t,i){this.gl=bongiovi.GL.gl,this.idVertex=t,this.idFragment=i,this.parameters=[],this.uniformTextures=[],this.vertexShader=void 0,this.fragmentShader=void 0,this._isReady=!1,this._loadedCount=0,this.init()},i=t.prototype;i.init=function(){this.getShader(this.idVertex,!0),this.getShader(this.idFragment,!1)},i.getShader=function(t,i){var e=new XMLHttpRequest;e.hasCompleted=!1;var s=this;e.onreadystatechange=function(t){4==t.target.readyState&&(i?s.createVertexShaderProgram(t.target.responseText):s.createFragmentShaderProgram(t.target.responseText))},e.open("GET",t,!0),e.send(null)},i.createVertexShaderProgram=function(t){var i=this.gl.createShader(this.gl.VERTEX_SHADER);return this.gl.shaderSource(i,t),this.gl.compileShader(i),this.gl.getShaderParameter(i,this.gl.COMPILE_STATUS)?(this.vertexShader=i,void 0!=this.vertexShader&&void 0!=this.fragmentShader&&this.attachShaderProgram(),void this._loadedCount++):(console.warn(this.gl.getShaderInfoLog(i)),null)},i.createFragmentShaderProgram=function(t){var i=this.gl.createShader(this.gl.FRAGMENT_SHADER);return this.gl.shaderSource(i,t),this.gl.compileShader(i),this.gl.getShaderParameter(i,this.gl.COMPILE_STATUS)?(this.fragmentShader=i,void 0!=this.vertexShader&&void 0!=this.fragmentShader&&this.attachShaderProgram(),void this._loadedCount++):(console.warn(this.gl.getShaderInfoLog(i)),null)},i.attachShaderProgram=function(){this._isReady=!0,this.shaderProgram=this.gl.createProgram(),this.gl.attachShader(this.shaderProgram,this.vertexShader),this.gl.attachShader(this.shaderProgram,this.fragmentShader),this.gl.linkProgram(this.shaderProgram)},i.bind=function(){this._isReady&&(this.gl.useProgram(this.shaderProgram),void 0==this.shaderProgram.pMatrixUniform&&(this.shaderProgram.pMatrixUniform=this.gl.getUniformLocation(this.shaderProgram,"uPMatrix")),void 0==this.shaderProgram.mvMatrixUniform&&(this.shaderProgram.mvMatrixUniform=this.gl.getUniformLocation(this.shaderProgram,"uMVMatrix")),bongiovi.GLTool.setShader(this),bongiovi.GLTool.setShaderProgram(this.shaderProgram),this.uniformTextures=[])},i.isReady=function(){return this._isReady},i.uniform=function(t,i,e){if(this._isReady){"texture"==i&&(i="uniform1i");for(var s,r=!1,o=0;o<this.parameters.length;o++)if(s=this.parameters[o],s.name==t){s.value=e,r=!0;break}r?this.shaderProgram[t]=s.uniformLoc:(this.shaderProgram[t]=this.gl.getUniformLocation(this.shaderProgram,t),this.parameters.push({name:t,type:i,value:e,uniformLoc:this.shaderProgram[t]})),-1==i.indexOf("Matrix")?this.gl[i](this.shaderProgram[t],e):this.gl[i](this.shaderProgram[t],!1,e),"uniform1i"==i&&(this.uniformTextures[e]=this.shaderProgram[t])}},i.unbind=function(){},bongiovi.GLShader=t}()},{}],7:[function(){!function(){var t,i,e=function(t){return!(0==t||t&t-1)},s=function(s,r,o){if(r=r||!1,o=o||{},t=bongiovi.GL.gl,i=bongiovi.GL,r)this.texture=s;else{this.texture=t.createTexture(),this._isVideo="VIDEO"==s.tagName,this.magFilter=o.magFilter||t.LINEAR,this.minFilter=o.minFilter||t.LINEAR_MIPMAP_NEAREST,this.wrapS=o.wrapS||t.MIRRORED_REPEAT,this.wrapT=o.wrapT||t.MIRRORED_REPEAT;var n=s.width||s.videoWidth,a=s.height||s.videoHeight;n?e(n)&&e(a)||(this.wrapS=this.wrapT=t.CLAMP_TO_EDGE,this.minFilter==t.LINEAR_MIPMAP_NEAREST&&(this.minFilter=t.LINEAR),console.log(this.minFilter,t.LINEAR_MIPMAP_NEAREST,t.LINEAR)):(this.wrapS=this.wrapT=t.CLAMP_TO_EDGE,this.minFilter==t.LINEAR_MIPMAP_NEAREST&&(this.minFilter=t.LINEAR)),t.bindTexture(t.TEXTURE_2D,this.texture),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,s),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,this.magFilter),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,this.minFilter),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,this.wrapS),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,this.wrapT),this.minFilter==t.LINEAR_MIPMAP_NEAREST&&t.generateMipmap(t.TEXTURE_2D),t.bindTexture(t.TEXTURE_2D,null)}},r=s.prototype;r.updateTexture=function(i){t.bindTexture(t.TEXTURE_2D,this.texture),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,i),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,this.magFilter),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,this.minFilter),this.minFilter==t.LINEAR_MIPMAP_NEAREST&&t.generateMipmap(t.TEXTURE_2D),t.bindTexture(t.TEXTURE_2D,null)},r.bind=function(e){void 0==e&&(e=0),t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),t.uniform1i(i.shader.uniformTextures[e],e),this._bindIndex=e},r.unbind=function(){t.bindTexture(t.TEXTURE_2D,null)},bongiovi.GLTexture=s}()},{}],8:[function(){bongiovi=window.bongiovi||{},function(){var t=null,i=function(){this.aspectRatio=window.innerWidth/window.innerHeight,this.fieldOfView=45,this.zNear=5,this.zFar=3e3,this.canvas=null,this.gl=null,this.W=0,this.H=0,this.shader=null,this.shaderProgram=null},e=i.prototype;e.init=function(t){this.canvas=t,this.gl=this.canvas.getContext("experimental-webgl",{antialias:!0}),this.resize();this.gl.getParameter(this.gl.SAMPLES),this.gl.getContextAttributes().antialias;this.gl.viewport(0,0,this.gl.viewportWidth,this.gl.viewportHeight),this.gl.enable(this.gl.DEPTH_TEST),this.gl.enable(this.gl.CULL_FACE),this.gl.enable(this.gl.BLEND),this.gl.clearColor(0,0,0,1),this.gl.clearDepth(1),this.matrix=mat4.create(),mat4.identity(this.matrix),this.depthTextureExt=this.gl.getExtension("WEBKIT_WEBGL_depth_texture"),this.floatTextureExt=this.gl.getExtension("OES_texture_float"),this.enableAlphaBlending();var i=this;window.addEventListener("resize",function(){i.resize()})},e.getGL=function(){return this.gl},e.setShader=function(t){this.shader=t},e.setShaderProgram=function(t){this.shaderProgram=t},e.setViewport=function(t,i,e,s){this.gl.viewport(t,i,e,s)},e.setMatrices=function(t){this.camera=t},e.rotate=function(t){mat4.copy(this.matrix,t)},e.render=function(){null!=this.shaderProgram&&(this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT),this.gl.blendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA))},e.enableAlphaBlending=function(){this.gl.blendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA)},e.enableAdditiveBlending=function(){this.gl.blendFunc(this.gl.ONE,this.gl.ONE)},e.clear=function(t,i,e,s){this.gl.clearColor(t,i,e,s),this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT)},e.draw=function(t){function i(t,i,e){return void 0==i.cacheAttribLoc&&(i.cacheAttribLoc={}),void 0==i.cacheAttribLoc[e]&&(i.cacheAttribLoc[e]=t.getAttribLocation(i,e)),i.cacheAttribLoc[e]}this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform,!1,this.camera.getMatrix()),this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform,!1,this.matrix),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,t.vBufferPos);var e=i(this.gl,this.shaderProgram,"aVertexPosition");this.gl.vertexAttribPointer(e,t.vBufferPos.itemSize,this.gl.FLOAT,!1,0,0),this.gl.enableVertexAttribArray(e),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,t.vBufferUV);var s=i(this.gl,this.shaderProgram,"aTextureCoord");this.gl.vertexAttribPointer(s,t.vBufferUV.itemSize,this.gl.FLOAT,!1,0,0),this.gl.enableVertexAttribArray(s),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,t.iBuffer);for(var r=0;r<t.extraAttributes.length;r++){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,t.extraAttributes[r].buffer);var o=i(this.gl,this.shaderProgram,t.extraAttributes[r].name);this.gl.vertexAttribPointer(o,t.extraAttributes[r].itemSize,this.gl.FLOAT,!1,0,0),this.gl.enableVertexAttribArray(o)}t.drawType==this.gl.POINTS?this.gl.drawArrays(t.drawType,0,t.vertexSize):this.gl.drawElements(t.drawType,t.iBuffer.numItems,this.gl.UNSIGNED_SHORT,0)},e.resize=function(){this.W=window.innerWidth,this.H=window.innerHeight,this.canvas.width=this.W,this.canvas.height=this.H,this.gl.viewportWidth=this.W,this.gl.viewportHeight=this.H,this.gl.viewport(0,0,this.W,this.H),this.aspectRatio=window.innerWidth/window.innerHeight,this.render()},i.getInstance=function(){return null==t&&(t=new i),t},bongiovi.GL=i.getInstance(),bongiovi.GLTool=i.getInstance()}()},{}],9:[function(){!function(){var t=function(t,i,e){this.gl=bongiovi.GLTool.gl,this.vertexSize=t,this.indexSize=i,this.drawType=e,this.extraAttributes=[],this.vBufferPos=void 0,this._floatArrayVertex=void 0,this._init()},i=t.prototype;i._init=function(){},i.bufferVertex=function(t){for(var i=[],e=0;e<t.length;e++)for(var s=0;s<t[e].length;s++)i.push(t[e][s]);if(void 0==this.vBufferPos&&(this.vBufferPos=this.gl.createBuffer()),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.vBufferPos),void 0==this._floatArrayVertex)this._floatArrayVertex=new Float32Array(i);else if(t.length!=this._floatArrayVertex.length)this._floatArrayVertex=new Float32Array(i);else for(var e=0;e<t.length;e++)this._floatArrayVertex[e]=t[e];this.gl.bufferData(this.gl.ARRAY_BUFFER,this._floatArrayVertex,this.gl.STATIC_DRAW),this.vBufferPos.itemSize=3},i.bufferTexCoords=function(t){for(var i=[],e=0;e<t.length;e++)for(var s=0;s<t[e].length;s++)i.push(t[e][s]);this.vBufferUV=this.gl.createBuffer(),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.vBufferUV),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(i),this.gl.STATIC_DRAW),this.vBufferUV.itemSize=2},i.bufferData=function(t,i,e){for(var s=-1,r=0;r<this.extraAttributes.length;r++)if(this.extraAttributes[r].name==i){this.extraAttributes[r].data=t,s=r;break}for(var o=[],r=0;r<t.length;r++)for(var n=0;n<t[r].length;n++)o.push(t[r][n]);if(-1==s){var a=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,a);var h=new Float32Array(o);this.gl.bufferData(this.gl.ARRAY_BUFFER,h,this.gl.STATIC_DRAW),this.extraAttributes.push({name:i,data:t,itemSize:e,buffer:a,floatArray:h})}else{var a=this.extraAttributes[s].buffer;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,a);for(var h=this.extraAttributes[s].floatArray,r=0;r<o.length;r++)h[r]=o[r];this.gl.bufferData(this.gl.ARRAY_BUFFER,h,this.gl.STATIC_DRAW)}},i.bufferIndices=function(t){this.iBuffer=this.gl.createBuffer(),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.iBuffer),this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(t),this.gl.STATIC_DRAW),this.iBuffer.itemSize=1,this.iBuffer.numItems=t.length},bongiovi.Mesh=t}()},{}],10:[function(){!function(){var t,i,e=function(e,s,r){t=bongiovi.GL.gl,i=bongiovi.GL,void 0!=e&&(this.view="string"==typeof e?new bongiovi.ViewCopy("assets/shaders/copy.vert",e):e,this.width=void 0==s?512:s,this.height=void 0==r?512:r,this._init())},s=e.prototype;s._init=function(){this.fbo=new bongiovi.FrameBuffer(this.width,this.height),this.fbo.bind(),i.setViewport(0,0,this.fbo.width,this.fbo.height),i.clear(0,0,0,0),this.fbo.unbind()},s.render=function(t){return i.setViewport(0,0,this.fbo.width,this.fbo.height),this.fbo.bind(),i.clear(0,0,0,0),this.view.render(t),this.fbo.unbind(),this.fbo.getTexture()},s.getTexture=function(){return this.fbo.getTexture()},bongiovi.Pass=e}()},{}],11:[function(){!function(){var t=function(){this.gl=bongiovi.GLTool.gl,this._init()},i=t.prototype;i._init=function(){this.camera=new bongiovi.CameraPerspective,this.camera.setPerspective(45,window.innerWidth/window.innerHeight,5,3e3);var t=vec3.clone([0,0,500]),i=vec3.create(),e=vec3.clone([0,-1,0]);this.camera.lookAt(t,i,e),this.sceneRotation=new bongiovi.SceneRotation,this.rotationFront=mat4.create(),mat4.identity(this.rotationFront),this.cameraOtho=new bongiovi.Camera,this._initTextures(),this._initViews()},i._initTextures=function(){},i._initViews=function(){},i.loop=function(){this.update(),this.render()},i.update=function(){this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT),this.sceneRotation.update(),bongiovi.GLTool.setMatrices(this.camera),bongiovi.GLTool.rotate(this.sceneRotation.matrix)},i.render=function(){},bongiovi.Scene=t}()},{}],12:[function(){bongiovi=window.bongiovi||{},function(){var t=function(t){void 0==t&&(t=document),this._z=0,this._mouseZ=0,this._preZ=0,this._isRotateZ=0,this.matrix=mat4.create(),this.m=mat4.create(),this._vZaxis=vec3.clone([0,0,0]),this._zAxis=vec3.clone([0,0,-1]),this.preMouse={x:0,y:0},this.mouse={x:0,y:0},this._isMouseDown=!1,this._rotation=quat.clone([0,0,1,0]),this.tempRotation=quat.clone([0,0,0,0]),this._rotateZMargin=0,this.diffX=0,this.diffY=0,this._currDiffX=0,this._currDiffY=0,this._offset=.004,this._easing=.1,this._slerp=-1,this._isLocked=!1;var i=this;t.addEventListener("mousedown",function(t){i._onMouseDown(t)}),t.addEventListener("touchstart",function(t){i._onMouseDown(t)}),t.addEventListener("mouseup",function(t){i._onMouseUp(t)}),t.addEventListener("touchend",function(t){i._onMouseUp(t)}),t.addEventListener("mousemove",function(t){i._onMouseMove(t)}),t.addEventListener("touchmove",function(t){i._onMouseMove(t)}),t.addEventListener("mousewheel",function(t){i._onMouseWheel(t)}),t.addEventListener("DOMMouseScroll",function(t){i._onMouseWheel(t)})},i=t.prototype;i.lock=function(t){this._isLocked=t},i.getMousePos=function(t){var i,e;return void 0!=t.changedTouches?(i=t.changedTouches[0].pageX,e=t.changedTouches[0].pageY):(i=t.clientX,e=t.clientY),{x:i,y:e}},i._onMouseDown=function(t){if(!this._isLocked&&!this._isMouseDown){var i=this.getMousePos(t),e=quat.clone(this._rotation);this._updateRotation(e),this._rotation=e,this._isMouseDown=!0,this._isRotateZ=0,this.preMouse={x:i.x,y:i.y},i.y<this._rotateZMargin||i.y>window.innerHeight-this._rotateZMargin?this._isRotateZ=1:(i.x<this._rotateZMargin||i.x>window.innerWidth-this._rotateZMargin)&&(this._isRotateZ=2),this._z=this._preZ,this._currDiffX=this.diffX=0,this._currDiffY=this.diffY=0}},i._onMouseMove=function(t){this._isLocked||(this.mouse=this.getMousePos(t))},i._onMouseUp=function(){this._isLocked||this._isMouseDown&&(this._isMouseDown=!1)},i._onMouseWheel=function(t){if(!this._isLocked){t.preventDefault();var i=t.wheelDelta,e=t.detail,s=0;s=e?i?i/e/40*e>0?1:-1:-e/3:i/120,this._preZ-=5*s}},i.setCameraPos=function(t){if(console.log("Set camera pos : ",t),!(this._slerp>0)){var i=t.clone(this._rotation);this._updateRotation(i),this._rotation=t.clone(i),this._currDiffX=this.diffX=0,this._currDiffY=this.diffY=0,this._isMouseDown=!1,this._isRotateZ=0,this._targetQuat=t.clone(t),this._slerp=1}},i.resetQuat=function(){this._rotation=quat.clone([0,0,1,0]),this.tempRotation=quat.clone([0,0,0,0]),this._targetQuat=void 0,this._slerp=-1},i.update=function(){mat4.identity(this.m),void 0==this._targetQuat?(quat.set(this.tempRotation,this._rotation[0],this._rotation[1],this._rotation[2],this._rotation[3]),this._updateRotation(this.tempRotation)):(this._slerp+=.1*(0-this._slerp),this._slerp<.001?(quat.set(this._rotation,this._targetQuat[0],this._targetQuat[1],this._targetQuat[2],this._targetQuat[3]),this._targetQuat=void 0,this._slerp=-1):(quat.set(this.tempRotation,0,0,0,0),quat.slerp(this.tempRotation,this._targetQuat,this._rotation,this._slerp))),vec3.set(this._vZaxis,0,0,this._z),vec3.transformQuat(this._vZaxis,this._vZaxis,this.tempRotation),mat4.translate(this.m,this.m,this._vZaxis);Math.random()>.95;mat4.fromQuat(this.matrix,this.tempRotation),mat4.multiply(this.matrix,this.matrix,this.m)};i._updateRotation=function(t){if(this._isMouseDown&&!this._isLocked&&(this.diffX=this.mouse.x-this.preMouse.x,this.diffY=-(this.mouse.y-this.preMouse.y),this._isInvert&&(this.diffX=-this.diffX),this._isInvert&&(this.diffY=-this.diffY)),this._currDiffX+=(this.diffX-this._currDiffX)*this._easing,this._currDiffY+=(this.diffY-this._currDiffY)*this._easing,this._isRotateZ>0)if(1==this._isRotateZ){var i=-this._currDiffX*this._offset;i*=this.preMouse.y<this._rotateZMargin?-1:1;var e=quat.clone([0,0,Math.sin(i),Math.cos(i)]);quat.multiply(quat,t,e)}else{var i=-this._currDiffY*this._offset;i*=this.preMouse.x<this._rotateZMargin?1:-1;var e=quat.clone([0,0,Math.sin(i),Math.cos(i)]);quat.multiply(quat,t,e)}else{var s=vec3.clone([this._currDiffX,this._currDiffY,0]),r=vec3.create();vec3.cross(r,s,this._zAxis),vec3.normalize(r,r);var i=vec3.length(s)*this._offset,e=quat.clone([Math.sin(i)*r[0],Math.sin(i)*r[1],Math.sin(i)*r[2],Math.cos(i)]);quat.multiply(t,e,t)}this._z+=(this._preZ-this._z)*this._easing},bongiovi.SceneRotation=t}()},{}],13:[function(){bongiovi=window.bongiovi||{},void 0==window.requestAnimFrame&&(window.requestAnimFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(t){window.setTimeout(t,1e3/60)}}()),function(){var t=function(){this.FRAMERATE=60,this._delayTasks=[],this._nextTasks=[],this._deferTasks=[],this._highTasks=[],this._usurpTask=[],this._enterframeTasks=[],this._idTable=0,requestAnimFrame(this._loop.bind(this))},i=t.prototype;i._loop=function(){requestAnimFrame(this._loop.bind(this)),this._process()},i._process=function(){for(var t=0;t<this._enterframeTasks.length;t++){var i=this._enterframeTasks[t];null!=i&&void 0!=i&&i.func.apply(i.scope,i.params)}for(;this._highTasks.length>0;){var e=this._highTasks.pop();e.func.apply(e.scope,e.params)}for(var s=(new Date).getTime(),t=0;t<this._delayTasks.length;t++){var e=this._delayTasks[t];s-e.time>e.delay&&(e.func.apply(e.scope,e.params),this._delayTasks.splice(t,1))}s=(new Date).getTime();for(var r=1e3/this.FRAMERATE;this._deferTasks.length>0;){var i=this._deferTasks.shift(),o=(new Date).getTime();if(!(r>o-s)){this._deferTasks.unshift(i);break}i.func.apply(i.scope,i.params)}s=(new Date).getTime();for(var r=1e3/this.FRAMERATE;this._usurpTask.length>0;){var i=this._usurpTask.shift(),o=(new Date).getTime();if(!(r>o-s))break;i.func.apply(i.scope,i.params)}this._highTasks=this._highTasks.concat(this._nextTasks),this._nextTasks=[],this._usurpTask=[]},i.addEF=function(t,i,e){e=e||[];var s=this._idTable;return this._enterframeTasks[s]={scope:t,func:i,params:e},this._idTable++,s},i.removeEF=function(t){return void 0!=this._enterframeTasks[t]&&(this._enterframeTasks[t]=null),-1},i.delay=function(t,i,e,s){var r=(new Date).getTime(),o={scope:t,func:i,params:e,delay:s,time:r};this._delayTasks.push(o)},i.defer=function(t,i,e){var s={scope:t,func:i,params:e};this._deferTasks.push(s)},i.next=function(t,i,e){var s={scope:t,func:i,params:e};this._nextTasks.push(s)},i.usurp=function(t,i,e){var s={scope:t,func:i,params:e};this._usurpTask.push(s)},bongiovi.Scheduler=new t}()},{}],14:[function(){bongiovi=window.bongiovi||{},function(){SimpleImageLoader=function(){this._imgs={},this._loadedCount=0,this._toLoadCount=0,this._scope,this._callback,this._callbackProgress};var t=SimpleImageLoader.prototype;t.load=function(t,i,e,s){this._imgs={},this._loadedCount=0,this._toLoadCount=t.length,this._scope=i,this._callback=e,this._callbackProgress=s;for(var r=this,o=0;o<t.length;o++){var n=new Image;n.onload=function(){r._onImageLoaded()};var a=t[o],h=a.split("/"),u=h[h.length-1].split(".")[0];this._imgs[u]=n,n.src=a}},t._onImageLoaded=function(){if(this._loadedCount++,this._loadedCount==this._toLoadCount)this._callback.call(this._scope,this._imgs);else{var t=this._loadedCount/this._toLoadCount;this._callbackProgress&&this._callbackProgress.call(this._scope,t)}}}(),bongiovi.SimpleImageLoader=new SimpleImageLoader},{}],15:[function(){!function(){var t=function(t,i){void 0!=t&&(this.shader=new bongiovi.GLShader(t,i),this._init())},i=t.prototype;i._init=function(){console.log("Should be overwritten by SuperClass")},i.render=function(){console.log("Should be overwritten by SuperClass")},bongiovi.View=t}()},{}],16:[function(){!function(){{var t=bongiovi.View,i=function(i,e){void 0==i&&(i="assets/shaders/copy.vert",e="assets/shaders/copy.frag"),t.call(this,i,e)},e=i.prototype=new t;t.prototype}e._init=function(){var t=[],i=[],e=[0,1,2,0,2,3],s=1;t.push([-s,-s,0]),t.push([s,-s,0]),t.push([s,s,0]),t.push([-s,s,0]),i.push([0,0]),i.push([1,0]),i.push([1,1]),i.push([0,1]),this.mesh=new bongiovi.Mesh(4,6,bongiovi.GLTool.gl.TRIANGLES),this.mesh.bufferVertex(t),this.mesh.bufferTexCoords(i),this.mesh.bufferIndices(e)},e.render=function(t){this.shader.isReady()&&(this.shader.bind(),this.shader.uniform("texture","uniform1i",0),t.bind(0),bongiovi.GLTool.draw(this.mesh))},bongiovi.ViewCopy=i}()},{}]},{},[1]);
},{}]},{},[1]);
