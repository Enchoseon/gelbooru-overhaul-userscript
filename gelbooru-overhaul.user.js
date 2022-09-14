// ==UserScript==
// @name        Gelbooru Overhaul
// @namespace   https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/gelbooru-overhaul.user.js
// @version     0.7.2
// @description Various toggleable changes to Gelbooru such as enlarging the gallery, removing the sidebar, and more.
// @author      Enchoseon
// @include     *gelbooru.com*
// @run-at      document-start
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_download
// @grant       GM_addStyle
// ==/UserScript==

(function() {
    "use strict";
    class ConfigManager {
        currentConfigVersion = 1;
        config;
        constructor() {
            this.loadConfig();
        }
        loadConfig = function() {
            let cfg = GM_getValue("config", undefined);

            if (cfg == undefined) {
                this.config = this.getDefaultConfig();
                this.saveConfig();
            }
            else if (this.currConfigVersion > cfg.configVersion) {
                cfg = this.migrateConfig(cfg);
                this.config = cfg;
                this.saveConfig();
            }
            else {
                this.config = cfg;
            }
        }
        saveConfig = function(config) {
            GM_setValue("config", config);
        }
        saveConfig = function() {
            GM_setValue("config", this.config);
        }
        getDefaultConfig = function() {
            return {
                configVersion: 1,
                debug: false,
                darkMode: { // WIP
                    amoledDark: false,
                    autoDarkMode: true,
                    forceDarkMode: false,
                    timeDarkModeForce: false,
                    timeDarkModeStartHour: 18,
                    timeDarkModeEndHour: 6,
                },
                collapseSidebar: {
                    enabled: true,
                    collapsedWidth: "5px",
                    collapsedColor: "red",
                    expandedOpacity: "90%",
                },
                post: {
                    autoScroll: true,
                    center: true,
                    fitVertically: true,
                    fitHorizontallyOnExpand: true,
                    fitHorizontallyOnNarrow: true,
                },
                thumbnails: {
                    roundCorners: true,
                    enlargeOnHover: true,
                    enlargeScale: 3,
                    enlargeHighRes: true,
                    loadingIndicator: true,
                    maxCacheItems: 420,
                    preventOffscreen: true,
                    removeTitle: true,
                },
                fastDL: { // RMB downloading / RMB + Shift to open context menu  loading takes time and does not appear until the end
                    enabled: true, //   for thumbnails
                    enabledForPost: true, // for posts
                    saveAs: false, // does not works for me
                    alsoSaveTags: true, // as a text file with the same name
                    fileNamePattern: "%postId% - %artist%", // %md5% %postId% %artist% %character% %copyright%
                    fileNameArraySeparator: ", ",
                    // set "Download Mode" to "Browser API" in advanced config to see downloading progress
                }
            };
        }
        migrateConfig = function(migratingConfig) {
            // step by step migration
            /*
        if(migratingConfig.configVersion == 0){
            // changes for next config version
            let migrationObject = {
                newProp: defaultValue,
                newNestedObj: {
                    newNestedProp: defaultValue,
                },
            };
            // migrate to keep old config
            migratingConfig = MergeRecursive(migrationObject, migratingConfig);
            // migrate property values and NECESSARILY configVersion
            migratingConfig.configVersion = 1;
            migratingConfig.newProp = migratingConfig.outdatedProp;
            // remove no longer needed properties
            delete migratingConfig.outdatedProp;
        }
        // next migrate step here...
        if(migratingConfig.configVersion == 1){}
        */

            // return updated config
            return migratingConfig;

            // https://stackoverflow.com/a/383245/19972602
            function MergeRecursive(obj1, obj2) {

                for (var p in obj2) {
                  try {
                    // Property in destination object set; update its value.
                    if ( obj2[p].constructor==Object ) {
                      obj1[p] = MergeRecursive(obj1[p], obj2[p]);
              
                    } else {
                      obj1[p] = obj2[p];
              
                    }
              
                  } catch(e) {
                    // Property in destination object not set; create it and set its value.
                    obj1[p] = obj2[p];
              
                  }
                }
              
                return obj1;
              }
        }

    }

    const PageTypes = Object.freeze({ GALLERY: "gallery", POST: "post", WIKI_VIEW: "wiki_view", POOL_VIEW: "pool_view", UNDEFINED: "undefined" });

    let configManager = new ConfigManager();

    debugLog("Loaded config", configManager.config);
    debugLog("Current page type is " + detectPageType());

    debugLog("Registering styles");
    registerStyles();

    debugLog("Registering config window");
    registerConfigWindow();

    // Page specific tweaks
    switch (detectPageType()) {
        case PageTypes.GALLERY:
            if(configManager.config.collapseSidebar.enabled)   applyTweakGalleryCollapseSidebar();
            if(configManager.config.thumbnails.enlargeOnHover) applyTweakGalleryEnlargeOnHover();
            if(configManager.config.thumbnails.roundCorners)   applyTweakGalleryRoundCorners();
            if(configManager.config.thumbnails.removeTitle)    applyTweakGalleryRemoveTitle();
            if(configManager.config.fastDL.enabled)            applyTweakGalleryFastDL();
            break;
        case PageTypes.POST:
            if(configManager.config.collapseSidebar.enabled)        applyTweakPostCollapseSidebar();
            if(configManager.config.post.center)                    applyTweakPostCenter();
            if(configManager.config.post.fitVertically)             applyTweakPostFitH();
            if(configManager.config.post.fitHorizontallyOnNarrow)   applyTweakPostOnNarrow();
            if(configManager.config.post.autoScroll)                applyTweakPostAutoScroll();
            if(configManager.config.post.fitHorizontallyOnExpand)   applyTweakPostOnExpand();
            if(configManager.config.thumbnails.enlargeOnHover)      applyTweakPostEnlargeOnHover();
            if(configManager.config.thumbnails.roundCorners)        applyTweakPostRoundCorners();
            if(configManager.config.fastDL.enabled)                 applyTweakPostFastDL();
            if(configManager.config.fastDL.enabledForPost)          applyTweakPostFastDLPost();
            break;
        case PageTypes.WIKI_VIEW:

            break;
        case PageTypes.POOL_VIEW:

            break;
        case PageTypes.UNDEFINED:

            break;
    }
    // Register styles
    function registerStyles() {
        // applyTweakCollapseSidebar
        GM_addStyle(`
              .go-collapse-sidebar {
                  position: fixed;
                  width: ${configManager.config.collapseSidebar.collapsedWidth};
                  height: 100%;
                  margin: 0px;
                  overflow: hidden;
                  background: ${configManager.config.collapseSidebar.collapsedColor};
                  transition: 142ms;
                  font-size: 1em;
                  z-index: 420690;
              }
              .go-collapse-sidebar:hover {
                  position: fixed;
                  width: min-content;
                  height: 100%;
                  padding-right: 12px;
                  overflow-y: scroll;
                  background: black;
                  opacity: ${configManager.config.collapseSidebar.expandedOpacity};
              }

              /* add some top/bottom paddings */
              #tag-list.go-tag-list-top-bottom-padding {
                  padding-top: 12px;
                  padding-bottom: 12px;
              }

              /* fix post list grid */
              #container.go-collapse-sidebar-container-tweak {
                  grid-template-columns: 0px auto;
              }
              @media only screen and (max-width: 850px) {
                  #container.go-collapse-sidebar-container-tweak {
                      grid-template-columns: auto;
                  }
              }

              /* fix tag count wrap */
              #tag-list li.go-collapse-sidebar-tags-list-tweak {
                  width: max-content !important;
                  display: block;
              }

              /* fix tag category hiding*/
              @media only screen and (max-width: 850px) {
                  .sm-hidden.go-sm-unhidden {
                      display: contents;
                  }
              }

              /* fix mobile spacing */
              .go-mobile-unspacing {
                  margin-right: 0;
              }
        `);

        // applyTweakPost
        GM_addStyle(`
            .go-fit-height {
                max-height: 95vh;
                max-width: auto;
                width: auto;
                height: auto;
            }
            .go-center {
                display: block;
                margin: 0 auto;
            }
            .note-container.go-center {
                display: table;
                margin: 0 auto;
            }
            @media only screen and (max-width: 850px) {
                .go-fit-width-on-narrow {
                    max-width: 95vh;
                    max-height: none;
                    height: auto;
                    width: auto;
                }
            }
        `);

        // applyTweakGallery
        GM_addStyle(`
            .thumbnail-preview .go-thumbnail-enlarge {
                transform: scale(1);
                transition: transform 169ms;
            }
            .thumbnail-preview .go-thumbnail-enlarge:hover {
                transform: scale(${configManager.config.thumbnails.enlargeScale});
                transition-delay: 142ms;
            }
            .thumbnail-preview:hover {
                z-index: 690;
            }
            
            .go-thumbnail-corners {
                border-radius: 3%;
            }
            
            .go-thumbnail-enlarge-post {
                transform: scale(1);
                transition: transform 169ms;
                display: inline-block;
            }
            .go-thumbnail-enlarge-post:hover {
                transform: scale(${configManager.config.thumbnails.enlargeScale});
                transition-delay: 142ms;
                z-index: 690;
                position: relative;
            }
        `);

        // loader
        GM_addStyle(`
            .go-loader {
                position: relative;
            }
            .go-loader:before {
                content: "loading";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                background: yellow;
                color: red;
                pointer-events: none;
        `);

        // config window
        GM_addStyle(`
            /* MAIN */
            .go-config-window {
                font-size: 1.2em;
                display:flex;
                flex-direction: column;
                overflow:hidden;

                box-shadow: 0 0 0.2rem 1px;
                min-width: 45%;
                min-height: 30%;
                max-width: 80%;
                max-height: 70%;

                position: fixed;
                visibility: visible;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                z-index: 3901;
            }
            .go-config-window-hidden {
                visibility: hidden;
            }

            /* HEADER */
            .go-config-window header {
                font-weight: bold;
                padding: 20px 12px;
                overflow: visible;
            }
            .go-config-window header a {
                padding: 0;
                font-size: 1.4em;
                pointer-events: none;
            }
            /* FOOTER */
            .go-config-window footer {
                padding: 14px;
            }
            .go-config-window footer input {
                border: 1px solid;
            }

            /* PREFERENCES */
            .go-config-window dl {
                padding: 18px;
                overflow-y: scroll;
            }

            /* PREFERENCE CATEGORY NAME */
            .go-config-window dt {
                border-bottom: 1px solid;
                margin-bottom: 12px;
                padding-bottom: 6px;
            }
            /* PREFERENCE CATEGORY ITEMS */
            .go-config-window dd {
                margin-left: 16px;
                margin-bottom: 14px;
            }

            /* PREFERENCE CATEGORY ITEM */
            .go-config-window li
            {
                list-style-type: none;
                margin-bottom: 12px;
            }
            /* PREFERENCE ITEM NAME */
            .go-config-window label
            {
                font-weight: bold;
            }
            /* PREFERENCE ITEM DESCRIPTION */
            .go-config-window p
            {
                font-size: 0.9em;
                opacity: 0.9;
            }
            
            /* INPUT TYPE SPECIFIC */
            .go-config-window .text-input label {
                display: inline-block;
                margin-bottom: 8px;
            }
            .go-config-window .text-input input {
                display: block;
                margin-left: 4px;
                margin-bottom: 6px;
                padding: 0 6px;
                width: -webkit-fill-available;
                height: 1.5em;
            }
            .go-config-window .checkbox-input p {
                margin-left: 18px;
            }
        `);
        // better backhround color detection
        onDOMReady(()=> {
            let bodyColor = window.getComputedStyle(document.body, null).backgroundColor;
            GM_addStyle(`
                .go-config-window {
                    background: ${bodyColor == "rgba(0, 0, 0, 0)" ? "white" : bodyColor};
                }
            `);
        });
    }
    // Apply Tweak
    function applyTweakPostCollapseSidebar() {
        debugLog("Applying TweakCollapseSidebar");
        onDOMReady(() => {
            document.querySelector("#container > section").classList.add("go-collapse-sidebar");
            document.querySelector("#tag-list").classList.add("go-tag-list-top-bottom-padding");

            document.querySelectorAll("#tag-list > li[class*='tag-type']").forEach((i) => { i.classList.add("go-collapse-sidebar-tags-list-tweak"); });
            document.querySelector("#container").classList.add("go-collapse-sidebar-container-tweak");
            document.querySelectorAll("#tag-list > .sm-hidden").forEach((i) => { i.classList.add("go-sm-unhidden") });
            document.querySelectorAll("#tag-list > li > .sm-hidden").forEach((i) => { i.classList.add("go-sm-unhidden") });
        });
    }
    function applyTweakPostFitH() {
        debugLog("Applying PostFitH");
        onDOMReady(() => {
            let noteContainer = document.querySelector(".image-container.note-container");

            // there is no note container on video pages
            if (noteContainer) {
                noteContainer.classList.add("go-fit-height");

                let image = document.querySelector("#image");
                image.classList.add("go-fit-height");
                image.classList.remove("fit-width");
            } else {
                let video = document.querySelector("#gelcomVideoPlayer");
                video.classList.add("go-fit-height");
                video.classList.remove("fit-width");
            }
        });
    }
    function applyTweakPostCenter() {
        debugLog("Applying PostCenter");
        onDOMReady(() => {
            let noteContainer = document.querySelector(".image-container.note-container");

            // there is no note container on video pages
            if (noteContainer) {
                noteContainer.classList.add("go-center");

                let image = document.querySelector("#image");
                image.classList.add("go-center");
            } else {
                let video = document.querySelector("#gelcomVideoPlayer");
                video.classList.add("go-center");
            }
        });
    }
    function applyTweakPostOnNarrow() {
        debugLog("Applying PostOnNarrow");
        onDOMReady(() => {
            let noteContainer = document.querySelector(".image-container.note-container");

            // there is no note container on video pages
            if (noteContainer) {
                noteContainer.classList.add("go-fit-width-on-narrow");

                let image = document.querySelector("#image");
                image.classList.add("go-fit-width-on-narrow");
            } else {
                let video = document.querySelector("#gelcomVideoPlayer");
                video.classList.add("go-fit-width-on-narrow");
            }
        });
    }
    function applyTweakPostAutoScroll() {
        debugLog("Applying PostAutoScroll");

        document.addEventListener("readystatechange", autoScroll);
    }
    function applyTweakPostOnExpand() {
        debugLog("Applying PostOnExpand");
        onDOMReady(() => {
            let resizeLink = document.querySelector("#resize-link");

            // only if resize link is present, otherwise you dont want to expand low res image
            if (resizeLink) {
                resizeLink.addEventListener("click", toggleFitMode);
            }
        });
    }
    function applyTweakPostEnlargeOnHover() {
        debugLog("Applying PostEnlargeOnHover");
        onDOMReady(() => {
            let divs = document.querySelectorAll(".mainBodyPadding > div");
            divs[divs.length - 1].querySelectorAll("a > img").forEach((i) => {
                i.parentElement.classList.add("go-thumbnail-enlarge-post");
                if (configManager.config.thumbnails.enlargeHighRes) {
                    i.setAttribute("data-thumb-src", i.src);
                    i.addEventListener("mouseenter", (e) => setImageHighResSource(e.target));
                    i.addEventListener("mouseleave", (e) => setImageLowResSource(e.target));
                }
                if (configManager.config.thumbnails.preventOffscreen)
                    i.parentElement.addEventListener("mouseenter", updateTransformOrigin);
                if (configManager.config.thumbnails.loadingIndicator)
                    i.addEventListener("mouseenter", addLoadingIndicator);
            });
        });
    }
    function applyTweakPostRoundCorners() {
        debugLog("Applying PostRoundCorners");
        onDOMReady(() => {
            let divs = document.querySelectorAll(".mainBodyPadding > div");
            divs[divs.length - 1].querySelectorAll("a > img").forEach((i) => {
                i.classList.add("go-thumbnail-corners");
            });
        });
    }
    function applyTweakPostFastDL() {
        debugLog("Applying PostFastDL");
        onDOMReady(() => {
            let divs = document.querySelectorAll(".mainBodyPadding > div");
            divs[divs.length - 1].querySelectorAll("a > img").forEach((i) => {
                i.addEventListener("contextmenu", e => downloadPostById(e, /id=([0-9]+)/.exec(i.parentElement.href)[1]));
            });
        });
    }
    function applyTweakPostFastDLPost() {
        debugLog("Applying PostFastDLPost");
        onDOMReady(() => {
            document.querySelector("#gelcomVideoPlayer, #image").addEventListener("contextmenu", (e) => {
                if (e.altKey)
                    return false;

                e.preventDefault();
                downloadPost(/id=([0-9]+)/.exec(document.location.href)[1])
                    .catch((error) => debugLog("Failed to download current post with following error:", error));
            });
        });
    }

    function applyTweakGalleryCollapseSidebar() {
        debugLog("Applying TweakCollapseSidebar");
        onDOMReady(() => {
            document.querySelector("#container > section").classList.add("go-collapse-sidebar");
            document.querySelector("#tag-list").classList.add("go-tag-list-top-bottom-padding");

            document.querySelectorAll("#tag-list > li").forEach((i) => { i.classList.add("go-collapse-sidebar-tags-list-tweak"); });
            document.querySelector("#container").classList.add("go-collapse-sidebar-container-tweak");
            document.querySelectorAll("#tag-list > li > a.mobile-spacing").forEach((i) => { i.classList.add("go-mobile-unspacing") });
            document.querySelectorAll(".aside > .sm-hidden").forEach((i) => { i.classList.add("go-sm-unhidden") });
        });
    }
    function applyTweakGalleryEnlargeOnHover() {
        debugLog("Applying GalleryEnlargeOnHover");
        onDOMReady(() => {
            document.querySelectorAll(".thumbnail-preview > a > img").forEach((i) => {
                i.parentElement.classList.add("go-thumbnail-enlarge");
                if (configManager.config.thumbnails.enlargeHighRes) {
                    i.setAttribute("data-thumb-src", i.src);
                    i.addEventListener("mouseenter", (e) => setImageHighResSource(e.target));
                    i.addEventListener("mouseleave", (e) => setImageLowResSource(e.target));
                }
                if (configManager.config.thumbnails.preventOffscreen)
                    i.parentElement.addEventListener("mouseenter", updateTransformOrigin);
                if (configManager.config.thumbnails.loadingIndicator)
                    i.addEventListener("mouseenter", addLoadingIndicator);
            });
        });
    }
    function applyTweakGalleryRoundCorners() {
        debugLog("Applying GalleryRoundCorners");
        onDOMReady(() => {
            document.querySelectorAll(".thumbnail-preview > a > img").forEach((i) => {
                i.classList.add("go-thumbnail-corners");
            });
        });
    }
    function applyTweakGalleryRemoveTitle() {
        debugLog("Applying GalleryRemoveTitle");
        onDOMReady(() => {
            document.querySelectorAll(".thumbnail-preview > a > img").forEach((i) => {
                i.setAttribute("data-title", i.title);
                i.removeAttribute("title");
            });
        });
    }
    function applyTweakGalleryFastDL() {
        debugLog("Applying GalleryFastDL");
        onDOMReady(() => {
            document.querySelectorAll(".thumbnail-preview > a > img").forEach((i) => {
                i.addEventListener("contextmenu", e => downloadPostById(e, i.parentElement.id.substring(1)));
            });
        });
    }
    // Functions
    function registerConfigWindow() {
        class PreferenceCategory {
            name;
            preferences;
            constructor (name, preferences) {
                this.name = name;
                this.preferences = preferences;
            }
        }
        class PreferenceItem {
            name;
            description;
            valuePath;
            constructor (name, description, valuePath) {
                this.name = name;
                this.description = description;
                this.valuePath = valuePath;
            }
        }
        // config modal window
        let sDiv = buildSettingsWindow([
                new PreferenceCategory("General", [
                    new PreferenceItem("Debug", "Enable debugging information in the console", "debug")
                ]),
                new PreferenceCategory("Collapsible Sidebar", [
                    new PreferenceItem("Enable", "", "collapseSidebar.enabled"),
                    new PreferenceItem("Width" , "Width of collapsed sidebar", "collapseSidebar.collapsedWidth")
                ]),
                new PreferenceCategory("Collapsible Sidebar", [
                    new PreferenceItem("Enable", "", "collapseSidebar.enabled"),
                    new PreferenceItem("Width" , "Width of collapsed sidebar", "collapseSidebar.collapsedWidth")
                ]),
                new PreferenceCategory("Collapsible Sidebar", [
                    new PreferenceItem("Enable", "", "collapseSidebar.enabled"),
                    new PreferenceItem("Width" , "Width of collapsed sidebar", "collapseSidebar.collapsedWidth")
                ]),
                new PreferenceCategory("Collapsible Sidebar", [
                    new PreferenceItem("Enable", "", "collapseSidebar.enabled"),
                    new PreferenceItem("Width" , "Width of collapsed sidebar", "collapseSidebar.collapsedWidth")
                ])
        ]);

        // button to open window
        let settingsButton = buildSettingsButton(sDiv);

        onDOMReady(() => {
            let topnav = document.querySelector("#myTopnav");
            topnav.insertBefore(settingsButton, topnav.querySelectorAll("a")[1]);
            document.querySelector("#container").appendChild(sDiv);
        });

        function buildSettingsButton(settingsElem) {
            let settingsButton = document.createElement("a");
            settingsButton.text = "Overhaul";
            settingsButton.style = "cursor: pointer;";

            settingsButton.addEventListener("click", (e) => {
                settingsElem.classList.toggle("go-config-window-hidden");
            });
            let observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === "class" && mutation.target.classList.contains("go-config-window-hidden")) {
                        settingsButton.classList.remove("active");
                    } else {
                        settingsButton.classList.add("active");
                    }
                });
            });
            observer.observe(settingsElem, { attributes: true });
            return settingsButton;
        }
        function buildSettingsWindow(content) {
            
            let sDiv = document.createElement("div");
            sDiv.classList = "go-config-window go-config-window-hidden";
            sDiv.id = "goConfigWindow";

            sDiv.innerHTML = buildSettingsTemplate(content);
            sDiv.querySelector("input[value='Close']").addEventListener("click", () => sDiv.classList.toggle("go-config-window-hidden") );

            return sDiv;
        }
        function buildSettingsTemplate(content){
            return `
            <header class="topnav"><a>Gelbooru Overhaul</a></header>
            <dl>
                ${content.map(buildPrefCatTemplate).join("\n")}
            </dl>
            <footer>
                <input type="submit" value="Close" class="searchList">
            </footer>
            `;
        }
        function buildPrefCatTemplate(prefCat) {
            return `
            <dt>
                <h3>${prefCat.name}</h3>
            </dt>
            <dd>
                <ul>
                    ${prefCat.preferences.map(buildPrefItemTemplate).join("\n")}
                </ul>
            </dd>
            `;
        }
        function buildPrefItemTemplate(pref){
            let type = typeof(resolve(pref.valuePath, configManager.config));
            switch (type) {
                case "boolean":
                    return `
                        <li class="checkbox-input">
                            <input type="checkbox" id="${pref.valuePath}" name="${pref.valuePath}"/>
                            <label for="${pref.valuePath}">${pref.name}</label>
                            <p>${pref.description}</p>
                        </li>
                    `;
                case "string":
                    return `
                        <li class="text-input">
                        <label>${pref.name}</label>
                        <input type="text"/>
                        <p>${pref.description}</p>    
                        </li>
                    `;
                default:
                    throw new TypeError(`Unknown type ${type} of config.${pref.valuePath}`);
            }
        }
    }
    function detectPageType() {
        let params = new URLSearchParams(document.URL.split('?')[1]);

        if (!params.has("page"))
            return PageTypes.UNDEFINED;

        if (params.get("page") == "post" && params.get("s") == "list")
            return PageTypes.GALLERY;

        if (params.get("page") == "post" && params.get("s") == "view")
            return PageTypes.POST;

        if (params.get("page") == "wiki" && params.get("s") == "view")
            return PageTypes.WIKI_VIEW;

        if (params.get("page") == "pool" && params.get("s") == "show")
            return PageTypes.POOL_VIEW;

        return PageTypes.UNDEFINED;
    }
    function onDOMReady(func) {
        if (document.readyState == "loaded" || document.readyState == "interactive" || document.readyState == "complete") {
            func();
        } else {
            document.addEventListener("DOMContentLoaded", function(event) {
                func();
            });
        }
    }
    function debugLog(message, value) {
        // Notice no debug until configManager loades and migrates config
        // Probably im should add force debug while migrating config...
        if (configManager.config.debug == true) {
            if (!value)
                console.log("[GELO]: " + message);
            else
                console.log("[GELO]: " + message, value);
        }
    }
    function loadPostItem(postId) {
        return new Promise((resolve, reject) => {
            let postCache = GM_getValue("postCache", {});

            // just clear postCache if exceeded limit
            if (Object.keys(postCache).length > configManager.config.thumbnails.maxCacheItems)
                postCache = {};

            if (!postCache[postId]) {
                fetch("https://gelbooru.com/index.php?page=post&s=view&id=" + postId)
                    .then(response => {
                        if (!response.ok) throw Error(response.statusText);
                        return response.text();
                    })
                    .then(text => {
                        let parser = new DOMParser();
                        let htmlDocument = parser.parseFromString(text, "text/html");

                        let fileLink = htmlDocument.querySelector("meta[property='og:image']").content;
                        let highResThumb = htmlDocument.querySelector("video") ? fileLink.replace(new RegExp(/\.([^\.]+)$/, "gm"), ".jpg") : fileLink;
                        let md5 = htmlDocument.querySelector("video") ? "0".repeat(32) : htmlDocument.querySelector("section.image-container").getAttribute("data-md5");
                        // video have highRes thumbnail but does not have md5

                        let tags = {
                            artist: [...htmlDocument.querySelectorAll(".tag-type-artist    > a")].map(i => i.text),
                            character: [...htmlDocument.querySelectorAll(".tag-type-character > a")].map(i => i.text),
                            copyright: [...htmlDocument.querySelectorAll(".tag-type-copyright > a")].map(i => i.text),
                            metadata: [...htmlDocument.querySelectorAll(".tag-type-metadata  > a")].map(i => i.text),
                            general: [...htmlDocument.querySelectorAll(".tag-type-general   > a")].map(i => i.text),
                        };

                        if (!highResThumb || !fileLink) throw new Error("Failed to parse url");

                        postCache[postId] = {
                            highResThumb: highResThumb,
                            download: fileLink,
                            tags: tags,
                            md5: md5
                        };

                        GM_setValue("postCache", postCache);
                        resolve(postCache[postId])
                    })
                    .catch(error => reject(error));
            } else {
                resolve(postCache[postId]);
            }
        });
    }
    function downloadPost(postId) {
        return new Promise((resolve, reject) => {
            loadPostItem(postId, true)
                .then((post) => {
                    //build filename
                    let filename = configManager.config.fastDL.fileNamePattern;
                    let spr = configManager.config.fastDL.fileNameArraySeparator;

                    filename = filename.replace("%md5%", post.md5);
                    filename = filename.replace("%postId%", postId);
                    filename = filename.replace("%artist%", post.tags.artist.length ? post.tags.artist.join(spr) : "unknown_artist");
                    filename = filename.replace("%character%", post.tags.character.length ? post.tags.character.join(spr) : "unknown_character");
                    filename = filename.replace("%copyright%", post.tags.copyright.length ? post.tags.copyright.join(spr) : "unknown_copyright");

                    filename = filename.replace(/[<>:"/\|?*]/, "_"); // illegal chars

                    GM_download({
                        url: post.download,
                        name: filename + "." + post.download.split(".").at(-1),
                        saveAs: configManager.config.fastDL.saveAs,
                    });

                    if (configManager.config.fastDL.alsoSaveTags) {
                        let text = post.tags.artist.map(i => "artist:" + i).join("\n") + "\n" +
                            post.tags.character.map(i => "character:" + i).join("\n") + "\n" +
                            post.tags.copyright.map(i => "series:" + i).join("\n") + "\n" +
                            post.tags.metadata.map(i => "meta:" + i).join("\n") + "\n" +
                            post.tags.general.join("\n") + "\n";

                        text = text.replaceAll("\n\n", "\n");

                        let elem = document.createElement("a");
                        elem.href = "data:text," + text;
                        elem.download = filename + ".txt";
                        elem.click();
                    }
                    debugLog("Downloading started", { url: post.download, filename });
                })
                .catch((error) => reject(error));
        });
    }
    function setImageHighResSource(img) {
        loadPostItem(/id=([0-9]+)/.exec(img.parentElement.href)[1])
            .then((post) => img.src = post.highResThumb)
            .catch((error) => debugLog("Failed to load highres image for following element with following error:", { img, error }));

    }
    function setImageLowResSource(img) {
        if (img.complete)
            img.src = img.getAttribute("data-thumb-src");
        else 
            img.addEventListener("load", () => img.src = img.getAttribute("data-thumb-src"), {once: true});
        
    }
    function autoScroll() {
        let image = document.querySelector("#image");

        if (image) {
            // only if image fit window
            debugLog(`Height is ${window.innerHeight} vs ${image.height}`);
            debugLog(`Width  is ${window.innerWidth} vs ${image.width}`);

            if (window.innerHeight > image.height && window.innerWidth > image.width) {
                debugLog("Scrolling");
                image.scrollIntoView({ block: "center", inline: "center" });
                history.scrollRestoration = 'manual';
            } else {
                history.scrollRestoration = 'auto';
            }
        }
        // not works for video
    }
    function toggleFitMode() {
        debugLog("Toggling fit mode");

        let noteContainer = document.querySelector(".note-container");
        noteContainer.classList.toggle("go-fit-height");

        let image = noteContainer.querySelector("#image");
        image.classList.toggle("go-fit-height");

        image.style.width = "";
        image.style.height = "";
        image.removeAttribute("width");
        image.removeAttribute("height");

        document.querySelector("#resize-link").style.display = "";
    }
    function updateTransformOrigin(e) {
        let elem = e.target;
        let rect = elem.getBoundingClientRect();
        let xOrigin = rect.x + (rect.width / 2);

        if (xOrigin - (rect.width * configManager.config.thumbnails.enlargeScale / 2) <= window.innerWidth * 0.01) {
            elem.style.transformOrigin = 'left';
        } else if (xOrigin + (rect.width * configManager.config.thumbnails.enlargeScale / 2) >= window.innerWidth * 0.99) {
            elem.style.transformOrigin = 'right';
        } else {
            elem.style.transformOrigin = '';
        }
    }
    function downloadPostById(e, postId) {
            if (e.shiftKey) {
                return true;
            }

            e.preventDefault();
            downloadPost(postId)
                .catch(error => debugLog("Failed to download following post with following error", { post: i, error }));;
    }
    function addLoadingIndicator(e) {
        e.target.parentElement.classList.add("go-loader");
        e.target.addEventListener("load", ee => {
            ee.target.parentElement.classList.remove("go-loader");
        }, {once: true});
    }
    function resolve(path, obj=self, separator='.') {
        var properties = Array.isArray(path) ? path : path.split(separator)
        return properties.reduce((prev, curr) => prev?.[curr], obj)
    }
})();
