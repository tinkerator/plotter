// Copyright 2021 Tinkerer <tinkerer@zappem.net>
//
// This code is released with the BSD 3-clause license.
// See the accompanying LICENSE file.
//
// A rudimentary canvas plotter.

var ZappemNet = ZappemNet || {};

ZappemNet.Plotter = function() {
  // function to paint a line of (attr, [[x,y], ...]) where the x,y
  // coordinates are post conversion "output coordinates".  default is
  // this.OutputLine unless this has non-null value.
  this.overrideLine = null;

  // attributes for plotting.
  this.attr = {};

  // Output coordinates
  this.MinX = 0;
  this.MaxX = 100;
  // note, the Y axis is reversed to make graphing conventional.
  this.MinY = 100;
  this.MaxY = 0;

  // Scale for graph plotting.
  this.CoordMinX = 0;
  this.CoordMaxX = 1000;
  this.CoordMinY = 0;
  this.CoordMaxY = 1000;
};

// OutputLine makes extensive use of .attr.ctx for the live graphics
// context. This may or may not be needed if the function is
// overridden with .overrideLine.
ZappemNet.Plotter.prototype.OutputLine = function(coords) {
  if (this.overrideLine != null) {
    return this.overrideLine(attr, coords);
  }

  if (coords == null || this.attr.ctx == null) {
    return;
  }

  for (var i = 0; i < coords.length; i++) {
    var xy = coords[i];
    if (i % 10 == 0) {
      if (i != 0) {
        this.attr.ctx.lineTo(xy[0], xy[1]);
        this.attr.ctx.stroke();
      }
      this.attr.ctx.beginPath();
      this.attr.ctx.moveTo(xy[0], xy[1]);
      continue;
    }
    this.attr.ctx.lineTo(xy[0], xy[1]);
  }
  this.attr.ctx.stroke();
};

// BindToCanvas forces the Plotter to associate with a canvas element.
// The margin_opt, in pixels, value (if provided) will be stored in
// the Plotter .attr.margin value. If the canvas dimension is
// insufficient to maintain 3x this margin, the margin is ignored.
ZappemNet.Plotter.prototype.BindToCanvas = function(element, margin_opt) {
  if (margin_opt != null) {
    this.attr.margin = margin_opt;
  }
  var m = this.attr.margin;
  var w = element.width;
  var h = element.height;
  var mx = m;
  if (3*m > w) {
    mx = 0;
  }
  var my = m;
  if (3*m > h) {
    my = 0;
  }
  this.MinX = mx;
  this.MaxX = w-mx;
  this.MinY = h-mx;
  this.MaxY = my;
  this.attr.ctx = element.getContext('2d');
};

// Frame renders the graph frame. This is usually done after the graph is
// plotted.
ZappemNet.Plotter.prototype.Frame = function() {
  var pt0 = [this.MinX, this.MinY];
  var pt2 = [this.MaxX, this.MaxY];
  var pt1 = [pt0[0], pt2[1]];
  var pt3 = [pt2[0], pt0[1]];

  var ow = this.attr.ctx.lineWidth;
  this.attr.ctx.lineWidth *= 2;
  this.OutputLine([pt0,pt1,pt2,pt3,pt0]);
  this.attr.ctx.lineWidth = ow;
};

// Solve for y0 at x=x0.
function solve(dx, dy, x, y, x0) {
  return y + dy/dx * (x0-x);
}

// Try to infer where a line should first be visible inside the
// clipping box.
function clip(dx, dy, pt, minX, maxX, minY, maxY) {
  if (pt[0] < minX) {
    pt[1] = solve(dx, dy, pt[0], pt[1], minX);
    pt[0] = minX;
  } else if (pt[0] > maxX) {
    pt[1] = solve(dx, dy, pt[0], pt[1], maxX);
    pt[0] = maxX;
  }
  if (pt[1] < minY) {
    pt[0] = solve(dy, dx, pt[1], pt[0], minY);
    pt[1] = minY;
  } else if (pt[1] > maxY) {
    pt[0] = solve(dy, dx, pt[1], pt[0], maxY);
    pt[1] = maxY;
  }
  return pt;
}

ZappemNet.Plotter.prototype.onXY = function(pt) {
  return (pt[0] >= this.CoordMinX) && (pt[0] <= this.CoordMaxX)
    && (pt[1] >= this.CoordMinY) && (pt[1] <= this.CoordMaxY);
}

// Line renders a line on the graph. It culls line segments for points off
// the graph active area.
ZappemNet.Plotter.prototype.Line = function(pts) {
  if (pts == null) {
    return;
  }
  var last = null;
  var replot = true;
  var bx = (this.MaxX-this.MinX)/(this.CoordMaxX-this.CoordMinX);
  var by = (this.MaxY-this.MinY)/(this.CoordMaxY-this.CoordMinY);
  var coords = [];
  for (var i = 0; i < pts.length; i++) {
    var pt = pts[i];
    var cXY = [pt[0], pt[1]];
    if (last == null) {
      last = pt;
      continue;
    }
    var dx = cXY[0]-last[0];
    var dy = cXY[1]-last[1];
    var onXY = this.onXY(cXY);
    if (replot) {
      last = clip(dx, dy, last,
                  this.CoordMinX, this.CoordMaxX,
                  this.CoordMinY, this.CoordMaxY);
    }
    var endSeg = false;
    if (!onXY) {
      cXY = clip(dx, dy, cXY,
                 this.CoordMinX, this.CoordMaxX,
                 this.CoordMinY, this.CoordMaxY);
      endSeg = true;
      onXY = this.onXY(cXY);
    }
    if (onXY) {
      if (replot) {
        coords.push([this.MinX+bx*(last[0]-this.CoordMinX),
                     this.MinY+by*(last[1]-this.CoordMinY)]);
      }
      coords.push([this.MinX+bx*(cXY[0]-this.CoordMinX),
                   this.MinY+by*(cXY[1]-this.CoordMinY)]);
      if (endSeg) {
        this.OutputLine(coords);
        coords = [];
      }
      replot = endSeg;
    }
    last = pt;
  }
  if (coords.length > 1) {
    this.OutputLine(coords);
  }
};

// Return the [minX, maxX, minY, maxY] values including any error
// contributions for a data set. The xer and yer values are column
// indices into the rows of pts, or 0|null in the case of no errors.
ZappemNet.Plotter.prototype.Bounds = function(pts, xer, yer) {
  var box = [0,0,1000,1000];
  if (pts != null) {
    for (var i = 0; i < pts.length; i++) {
      var pt = pts[i];
      var dx = xer ? pt[xer] : 0;
      if (i==0 || (pt[0]-dx < box[0])) {
        box[0] = pt[0]-dx;
      }
      if (i==0 || (pt[0]+dx > box[1])) {
        box[1] = pt[0]+dx;
      }
      var dy = yer ? pt[yer] : 0;
      if (i==0 || (pt[1]-dy < box[2])) {
        box[2] = pt[1]-dy;
      }
      if (i==0 || (pt[1]+dy > box[3])) {
        box[3] = pt[1]+dy;
      }
    }
  }
  return box;
};

// Places a mark (optionally) with x/y error bars on the Plotter.
ZappemNet.Plotter.prototype.Mark = function(x, y, xer, yer) {
  if (!this.onXY([x,y])) {
    return;
  }
  var w0 = this.attr.ctx.lineWidth;
  this.attr.ctx.lineWidth *= .5;

  var bx = (this.MaxX-this.MinX)/(this.CoordMaxX-this.CoordMinX);
  var by = (this.MaxY-this.MinY)/(this.CoordMaxY-this.CoordMinY);

  var cX = this.MinX+bx*(x-this.CoordMinX);
  var cY = this.MinY+by*(x-this.CoordMinY);
  var dx = 5./bx;
  var dy = 5./by;

  this.Line([[x-dx,y-dy], [x+dx,y+dy]]);
  this.Line([[x+dx,y-dy], [x-dx,y+dy]]);
  if (xer != null) {
    this.Line([[x-xer,y-dy], [x-xer,y+dy]]);
    this.Line([[x-xer,y], [x+xer,y]]);
    this.Line([[x+xer,y-dy], [x+xer,y+dy]]);
  }
  if (yer != null) {
    this.Line([[x-dx,y-yer], [x+dx,y-yer]]);
    this.Line([[x,y-yer], [x,y+yer]]);
    this.Line([[x-dx,y+yer], [x+dx,y+yer]]);
  }
  this.attr.ctx.lineWidth = w0;
};

ZappemNet.Plotter.prototype.Marks = function(pts, xers, yers) {
  if (pts == null) {
    return;
  }
  for (var i = 0; i<pts.length; i++) {
    var x = pts[i][0];
    var y = pts[i][1];
    var xe = xers ? pts[i][xers] : null;
    var ye = yers ? pts[i][yers] : null;
    this.Mark(x, y, xe, ye);
  }
};
