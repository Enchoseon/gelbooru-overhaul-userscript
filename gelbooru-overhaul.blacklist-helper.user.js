// ==UserScript==
// @name         Gelbooru Overhaul Blacklist Helper
// @namespace    https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/gelbooru-overhaul.user.js
// @version      1.0
// @description  Gelbooru Overhaul helper to automatically update your remote blacklists
// @author       PetrK39
// @match        https://*.gelbooru.com/*
// @icon         https://gelbooru.com/favicon.png
// @grant        GM_getResourceText
// @resource     Example_Blacklist_Gist   https://gist.githubusercontent.com/Username/gistkey/raw
// @resource     Example_Blacklist_GitHub https://raw.githubusercontent.com/Username/repository/main/blacklist.txt
// @resource     Example_Blacklist_Web    https://127.0.0.1/blacklist.txt
// @require     https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/resources/gelbooru-overhaul.utils.js
// ==/UserScript==

/*=================================================================================================================

TO INCLUDE YOUR AUTOMATICALLY UPDATING BLACKLIST INTO THE SCRIPT REPLACE @resource LINES ABOVE
YOU CAN HAVE MULTIPLE BLACKLISTS
UPDATING IS ONE WAY: REMOTE SOURCE TO SCRIPT. YOU CANNOT UPDATE YOUR BLACKLISTS IN GO SCRIPT

===================================================================================================================*/

(async function () {
    'use strict';
    /**
     * @typedef BlacklistItem
     * @type {Object}
     * @property {string} name
     * @property {string} value
     * @property {[boolean]} isReadOnly
     * @property {[boolean]} isUnRemovable
     * @property {[string]} hash
     */


    // load resource names
    let blacklistNames = GM_info.script.resources.map(i => i.name);

    // check if there is no resources
    if (blacklistNames.length == 0) {
        alert(`${GM_info.script.name}:\nPlease include link to your blacklist according to doc`);
        return;
    }

    // load blacklists
    /** @type {BlacklistItem} */
    let blacklists = blacklistNames.map(i => ({ name: i.replace("_", " "), value: GM_getResourceText(i), isReadOnly: true}));

    // check if there is broken links
    let brokenBlacklists = blacklists.filter(i => i.value == "")
    if (brokenBlacklists.length > 0) {
        alert(`${GM_info.script.name}:\nFollowing blacklists are empty or failed to download (check your links):\n${brokenBlacklists.map(i => i.name).join(", ")}`);
        return;
    }

    // generate hashes
    let promises = blacklists.map(async i => ({ ...i, hash: await utils.hash(i.value) }));
    blacklists = await Promise.all(promises);

    // put blacklists in local storage
    let oldBlacklists = localStorage.getItem("go-helper-blacklists");
    let newBlacklists = JSON.stringify(blacklists);

    if (!oldBlacklists || oldBlacklists != newBlacklists) {
        localStorage.setItem("go-helper-blacklists", newBlacklists);
    }
})();