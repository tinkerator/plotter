// Program web is a minimal webserver.
package main

import (
	"flag"
	"log"
	"net/http"
)

var addr = flag.String("addr", "localhost:8080", "webserver listening address")

func main() {
	flag.Parse()
	log.Fatal(http.ListenAndServe(*addr, http.FileServer(http.Dir("./"))))
}
