#!/usr/bin/env bash
# Global vars
GIT="https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/"
DEV="http://127.0.0.1:8000/"
# cd to gelbooru overhaul project root
cd "$(dirname "$0")" || exit
# Change the links back to the github links when exiting the script
cleanup() { 
	echo "Cleaning up..."
	sed -i "s|${DEV}|${GIT}|g" gelbooru-overhaul.user.js && echo "Replaced ${DEV} with ${GIT}"
 	exit
}
trap "cleanup" SIGINT
# Change all links to point to local dev version
sed -i "s|${GIT}|${DEV}|g" gelbooru-overhaul.user.js && echo "Replaced ${GIT} with ${DEV}"
# Serve and open gelbooru overhaul files on port 8000
sleep 0.1 && xdg-open http://127.0.0.1:8000/gelbooru-overhaul.user.js &
python3 -m http.server
