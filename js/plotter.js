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
  this.attr = {
    fontSize: 10
  };

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
// The opt_margin, in pixels, value (if provided) will be stored in
// the Plotter .attr.margin value. If the canvas dimension is
// insufficient to maintain 3x this margin, the margin is ignored.
ZappemNet.Plotter.prototype.BindToCanvas = function(element, opt_margin) {
  if (opt_margin != null) {
    this.attr.margin = opt_margin;
  }
  var m = this.attr.margin || 0;
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

ZappemNet.Plotter.prototype.onXY = function(pt, opt_tol) {
  var tol = opt_tol == null ? 0 : Math.abs(opt_tol);
  return (pt[0] >= this.CoordMinX-tol) && (pt[0] <= this.CoordMaxX+tol)
    && (pt[1] >= this.CoordMinY-tol) && (pt[1] <= this.CoordMaxY+tol);
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

// Place a series of marks with (optional) x/y error bars.
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

// These values are for use with Axis manipulation.
ZappemNet.Plotter.X0 = 1;
ZappemNet.Plotter.X1 = 2;
ZappemNet.Plotter.Y0 = 3;
ZappemNet.Plotter.Y1 = 4;

// Reframe adjusts the specified axis range to accommodate the column
// of the pts dataset.
ZappemNet.Plotter.prototype.Reframe = function(reset, direction, pts, col, col_er) {
  if (pts == null || pts.length == 0) {
    return;
  }
  box = [0,0];
  for (var i=0; i<pts.length; i++) {
      var pt = pts[i];
      var d = col_er ? pt[col_er] : 0;
    if (i==0 || (pt[col]-d < box[0])) {
      box[0] = pt[col]-d;
    }
    if (i==0 || (pt[col]+d > box[1])) {
      box[1] = pt[col]+d;
    }
  }
  switch (direction) {
  case ZappemNet.Plotter.X0:
  case ZappemNet.Plotter.X1:
    if (reset || (box[0] < this.CoordMinX)) {
      this.CoordMinX = box[0];
    }
    if (reset || (box[1] > this.CoordMaxX)) {
      this.CoordMaxX = box[1];
    }
    break;
  case ZappemNet.Plotter.Y0:
  case ZappemNet.Plotter.Y1:
    if (reset || (box[0] < this.CoordMinY)) {
      this.CoordMinY = box[0];
    }
    if (reset || (box[1] > this.CoordMaxY)) {
      this.CoordMaxY = box[1];
    }
    break;
  default:
    return;
  }
};

// Axis draws an axis line from an array of tics. Each position
// has: [offset, bool (large=true), label]. The direction parameter
// indicates which axis we are rendering. The opt_at value is the
// axis alignment coordinate. If it is not present, the direction
// parameter default prevails.
ZappemNet.Plotter.prototype.Axis = function(direction, tics, opt_at) {
  var oDX = 0;
  var oDY = 0;
  var oX;
  var oY;
  var fDX = 0;
  var fDY = 0;
  var x = null;
  var y = null;

  var ctx = this.attr.ctx;
  var oFont = ctx.font;
  ctx.font = `${this.attr.fontSize}px sans-serif`;
  var oAlign = ctx.textAlign;
  var oBaseline = ctx.textBaseline;

  switch (direction) {
  case ZappemNet.Plotter.X0:
    oDY = 1;
    fDY = 1.1 * this.attr.fontSize + 3;
    y = opt_at == null ? this.CoordMinY : opt_at;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    break;
  case ZappemNet.Plotter.X1:
    oDY = -1;
    fDY = -(1.1 * this.attr.fontSize + 3);
    y = opt_at == null ? this.CoordMaxY : opt_at;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    break;
  case ZappemNet.Plotter.Y0:
    oDX = -1;
    fDX = -10;
    x = opt_at == null ? this.CoordMinX : opt_at;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    break;
  case ZappemNet.Plotter.Y1:
    oDX = 1;
    fDX = 10;
    x = opt_at == null ? this.CoordMaxX : opt_at;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    break;
  default:
    console.log('unrecognized axis direction: '+direction);
    ctx.font = oFont;
    ctx.textAlign = oAlign;
    ctx.textBaseline = oBaseline;
    return;
  }
  if (tics == null || tics.length == 0) {
    ctx.font = oFont;
    ctx.textAlign = oAlign;
    ctx.textBaseline = oBaseline;
    return;
  }
  var ow = ctx.lineWidth;
  var bx = (this.MaxX-this.MinX)/(this.CoordMaxX-this.CoordMinX);
  var by = (this.MaxY-this.MinY)/(this.CoordMaxY-this.CoordMinY);
  var tol = Math.min(Math.abs(1/bx), Math.abs(1/by))*.5;
  for (var i = 0; i < tics.length; i++) {
    var tic = tics[i];
    if (x != null) {
      oX = this.MinX+bx*(x-this.CoordMinX);
      if (i == 0) {
        this.OutputLine([[oX, this.MinY], [oX, this.MaxY]]);
      }
      if (!this.onXY([x, tic[0]], tol)) {
        continue;
      }
      oY = this.MinY+by*(tic[0]-this.CoordMinY);
    } else {
      oY = this.MinY+by*(y-this.CoordMinY);
      if (i == 0) {
        this.OutputLine([[this.MinX, oY], [this.MaxX, oY]]);
      }
      if (!this.onXY([tic[0], y], tol)) {
        continue;
      }
      oX = this.MinX+bx*(tic[0]-this.CoordMinX);
    }
    var mul = tic[1] ? 6 : 3;
    this.OutputLine([[oX, oY], [oX+mul*oDX, oY+mul*oDY]]);
    if (tic[2] != null) {
      ctx.fillText(tic[2], oX+fDX, oY+fDY);
    }
  }
  ctx.lineWidth = ow;
  ctx.font = oFont;
  ctx.textAlign = oAlign;
  ctx.textBaseline = oBaseline;
};

// AutoTics returns a list of tic values for the specified
// direction. It pad is true, then once the major tics are identified,
// the range for this axis will be padded to start and end with a
// major tic. A return value of null indicates that tic values are not
// knowable.
ZappemNet.Plotter.prototype.AutoTics = function(direction, pad) {
  var range = null;
  switch (direction) {
  case ZappemNet.Plotter.X0:
  case ZappemNet.Plotter.X1:
    range = [this.CoordMinX, this.CoordMaxX];
    break;
  case ZappemNet.Plotter.Y0:
  case ZappemNet.Plotter.Y1:
    range = [this.CoordMinY, this.CoordMaxY];
    break;
  default:
    return range;
  }
  if (range[0] == range[1]) {
    if (!pad) {
      return null;
    }
    if (range[0] == 0) {
      range[0] = -1;
      range[1] = 1;
    } else {
      var d = range[0];
      range[0] -= d/20;
      range[1] += d/20;
    }
  } else {
      let d = range[1]-range[0];
      range[0] -= d/20;
      range[1] += d/20;
  }
  var d = range[1]-range[0];
  var n = Math.pow(10, Math.round(Math.log10(Math.abs(d))));
  if (pad) {
    var low = Math.floor(range[0]/n)*n;
    if (range[0] != low) {
      range[0] = low;
    }
    var high = Math.floor(range[1]/n)*n;
    if (range[1] != high) {
      range[1] = high+n;
    }
  }
  if (pad) {
    switch (direction) {
    case ZappemNet.Plotter.X0:
    case ZappemNet.Plotter.X1:
      this.CoordMinX = range[0];
      this.CoordMaxX = range[1];
      break;
    case ZappemNet.Plotter.Y0:
    case ZappemNet.Plotter.Y1:
      this.CoordMinY = range[0];
      this.CoordMaxY = range[1];
      break;
    default:
      return range;
    }
  }
  var tic = 0.1*n;
  var tics = [];
  for (var from=Math.round(range[0]/tic)*tic; from <= range[1]+0.5*tic; from += tic) {
    var major = (10*Math.round(from/n) == Math.round(from/tic));
    tics.push([from, major, major ? Math.round(from/tic)*tic : null]);
  }
  return tics;
};
