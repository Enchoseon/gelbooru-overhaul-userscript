# HOW TO MAKE YOUR BLACKLISTS AUTOUPDATABLE

Optionally, you can make your blacklists updated automatically using the helper script
[Installation link](https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/gelbooru-overhaul.blacklist-helper.user.js)

 ## Setting up script

 - It's recommended to set up helper script with higher priority than original script
 - Depending on your Userscript Manager you need to set up external resources update interval as high as possible. TamperMonkey example: Externals > Update Interval: > Always

## Supported sources

 - Github Repository: Use raw link (Example: `https://raw.githubusercontent.com/USER/PRIVATE_REPOSITORY/BLACKLIST_FILE.txt`)
 - Github Gist: Use alternative raw link to retrieve fresh files (Example: `https://gist.githubusercontent.com/USER/PRIVATE_GIST_KEY/raw`)
 - Any web host (Example: `https://yourdomain.com/Your_Blacklist.txt`)
 - Local file: Only for Google Chrome Users, requires Userscript Manager to access local files (Example: `file:///PATH/TO/FILE/Blacklist.txt`)

## Defining source

- Open installed script in your UserScript Manager
- Find `@resource` examples
- Replace them with your links and names
- Use `_` (underscore) instead of spaces

## Notes

Even after setting up UserScript Manager it doesn't update `@resource`'s instantly. It can take a few minutes.