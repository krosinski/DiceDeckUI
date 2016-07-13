cat config.js.tmpl | sed "s#_@ws_app_hostname_@#$1#g" > js/config.js
