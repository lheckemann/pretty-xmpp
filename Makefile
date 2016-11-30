.SUFFIXES:


all: $(addprefix dist/, bundle.js index.html zepto.min.js style.css message.webm)

dist:
	mkdir dist

dist/bundle.js: prettyxmpp.js dist
	node_modules/browserify/bin/cmd.js $< -d -o $@

dist/zepto.min.js: dist
	wget http://zeptojs.com/zepto.min.js -O $@
	touch $@ # wget changes modify date to the one reported by the server

dist/%: % dist
	cp $< $@
