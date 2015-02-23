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

function MarchingLine(pos, dir, color, bmp) {
	this.pos      = pos;
	this.startPos = vec3.clone(this.pos);
	this.dir      = dir;
	this.color    = hexToRgb(color);

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
	// noise *= noise;
	// noise *= noise;
	noise *= noiseRange;
	var shadowOffset = 1.0;
	var n = vec3.create();
	for(var i=1; i<noise; i++) {
		vec3.scale(this.shadows, i, n);
		vec3.add(n, this.pos);
		var alpha = (1 - Math.sin(i/noise * Math.PI * .5)) * 30;
		if(this.bmp.getPixel(n[0], n[1]).a != 255)
			this.bmp.delayMixPixel(n[0], n[1], this.color.r*shadowOffset, this.color.g*shadowOffset, this.color.b*shadowOffset, alpha);
	}
};


p.checkHit = function() {
	var x = Math.floor(this.pos[0]);
	var y = Math.floor(this.pos[1]);

	// console.log( x, y );
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
	var diff = vec3.subtract(this.pos, this.startPos);
	if(vec3.length(diff) < MIN_SPWAN_WIDTH) return [];

	var v1 = vec3.create();
	vec3.scale(diff, random(.2, .8), v1 );
	vec3.add(v1, this.startPos);

	var v2 = vec3.create();
	vec3.scale(diff, random(.2, .8), v2 );
	vec3.add(v2, this.startPos);


	var m = mat4.create();
	var thetaOffset = .05;
	mat4.identity(m);
	var theta = Math.random() > .5 ? random(-thetaOffset, thetaOffset) + Math.PI*.5 : random(-thetaOffset, thetaOffset) - Math.PI*.5;
	mat4.rotateZ(m, theta);
	var d1 = vec3.create(this.dir);
	mat4.multiplyVec3(m, d1);

	mat4.identity(m);
	var theta = Math.random() > .5 ? random(-thetaOffset, thetaOffset) + Math.PI*.5 : random(-thetaOffset, thetaOffset) - Math.PI*.5;
	mat4.rotateZ(m, theta);
	var d2 = vec3.create(this.dir);
	mat4.multiplyVec3(m, d2);


	return [{v:v1, d:d1}, {v:v2, d:d2}];
};

model.exports = MarchingLine();