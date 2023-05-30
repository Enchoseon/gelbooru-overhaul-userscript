# SERVING LOCAL FILES THROUGH A HTTP SERVER

The general advice you'll find online for editing userscripts in Violentmonkey as local files in your IDE of choice is to disable some Content-Security-Policies and allow CORS.

This is pretty messy and annoying, and its why most people stick to the good-old copy-and-paste method; or, god forbid, using the Violentmonkey in-browser script editor. Either way results in monolithic files, which some people attempt to circumvent by adding a build stage that crams all their modules into a monolithic webpacked file.

The solution? Split everything into maintainable chunks and serve it through a HTTP server. Now you're got modules, live updating, and local files! There are a lot of ways to do this, but I chose to use Python's built-in `http.server` module because I already have Python and it's only one command—

1. —In the root folder (`./gelbooru-overhaul-userscript`), run:
```bash
python3 -m http.server
```

Then, in `gelbooru-overhaul.user.js`, change all instances of "`https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/`" to "`http://127.0.0.1:8000/`" so that the local versions of `@required` files get used rather than the ones served on GitHub—

2. —On Linux this can be done with GNU sed, also in one command:
```bash
sed -i "s|https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/|http://127.0.0.1:8000/|g" gelbooru-overhaul.user.js
```

All that's left to do is tell Violentmonkey to install and automatically reload the script without prompting. Don't forget to temporarily turn off the GitHub version of Gelbooru Overhaul (if you have it installed) to avoid conflicts.—

3. —Open up `http://127.0.0.1:8000/gelbooru-overhaul.user.js` in your browser and install the script. Open up the script for editing in Violentmonkey and click on the "Settings" tab on the top navbar. Change `"Script settings"` from `"use global setting"` to `"on"` and check `"Allow update, then notify"`

To reverse the changes you can use—
```bash
sed -i "s|http://127.0.0.1:8000/|https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/|g" gelbooru-overhaul.user.js
```
—Or, you can choose to not bother at all and push changes using `git add --update --patch` and just leave out the localhost changes.

> **NOTE**: I've packaged these commands into a Bash file called `dev.sh` (available in project root) for my own convenience, and possibly yours. It even changes the links back to the GitHub ones when the script gets killed!
