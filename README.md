# plotter.js

## Overview

This is a minimal frills JavaScript canvas numerical data plotting
package.

We include a minimal webserver `web.go` (adapted from the
[`http.FileServer` example](https://pkg.go.dev/net/http#FileServer))
to explore hosted content. On your workstation, type:
```
$ go run web.go
```
and point your web browser at http://localhost:8080 . The
http://localhost:8080/plotter-test.html file provides a demo of
supported features.

## Features currently lacking (but planned)

- text, on plot, labels

## Validation

We include a sanity checking plotter-test.html file. This demostrates:

- binding the plotter to a canvas element
- lines with clipping
- x and y error bar markers
- bounding box computation
- axes with tick marks
  - manually computed and labeled
  - automatically computed

## License info

The plotter package is distributed with the BSD 3-clause license. See
the accompanying LICENSE file.

## Reporting bugs

Use the [github plotter bug
tracker](https://github.com/tinkerator/plotter/issues).
