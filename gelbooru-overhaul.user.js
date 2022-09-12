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
// @require     https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
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
                    enlargeOnHoverScale: 3,
                    enlargeOnHoverHighRes: true,
                    enlargeOnHoverHighResMaxCacheItems: 420,
                    preventEnlargeOffScreen: true,
                    removeTitle: true,
                },
                fastDL: { // RMB downloading / RMB + Alt to open context menu(does no work for some reason)   loading takes time and does not appear until the end
                    enabled: true, //   for thumbnails
                    enabledForPost: true, // for posts
                    saveAs: false, // does not works for me
                    alsoSaveTags: true, // as a text file with the same name
                    fileNamePattern: "%postId% - %artist%", // %md5% %postId% %artist% %character% %copyright%     arrays are joined with ", "

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
            migratingConfig = _.merge(migrationObject, migratingConfig);
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
            .go-fit-width {
                max-height: auto;
                max-width: 95vh;
                height: auto;
                width: auto;
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
            .thumbnail-preview a img.go-thumbnail-enlarge {
                transform: scale(1);
                transition: transform 169ms;
            }
            .thumbnail-preview a img.go-thumbnail-enlarge:hover {
                transform: scale(${configManager.config.thumbnails.enlargeOnHoverScale});
                transition-delay: 142ms;
            }
            .thumbnail-preview:hover {
                z-index: 690;
            }
            
            .go-thumbnail-corners {
                border-radius: 3%;
            }
            
            a img.go-thumbnail-enlarge-post {
                transform: scale(1);
                transition: transform 169ms;
            }
            a img.go-thumbnail-enlarge-post:hover {
                transform: scale(${configManager.config.thumbnails.enlargeOnHoverScale});
                transition-delay: 142ms;
                z-index: 690;
                position: relative;
            }
        `);

        // config window
        GM_addStyle(`
            .go-config-window {
                background: inherit;
                position: fixed;
                visibility: visible;
                min-width: 30%;
                min-height: 30%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                z-index: 3901;
            }
            .go-config-window-hidden {
                visibility: hidden;
            }
            #container {
                background: inherit;
            }
        `);
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

        document.addEventListener("readystatechange", () => {
            let image = document.querySelector("#image");

            if (image) {
                // only if image fit window
                debugLog(`Height is w${window.innerHeight} vs i${image.height}`);
                debugLog(`Width is w${window.innerWidth} vs i${image.width}`);

                if (window.innerHeight > image.height && window.innerWidth > image.width) {
                    debugLog("Scrolling");
                    image.scrollIntoView({ block: "center", inline: "center" });
                    history.scrollRestoration = 'manual';
                } else {
                    history.scrollRestoration = 'auto';
                }
            }
            // not works for video
        });
    }
    function applyTweakPostOnExpand() {
        debugLog("Applying PostOnExpand");
        onDOMReady(() => {
            let resizeLink = document.querySelector("#resize-link");

            // only if resize link is present, otherwise you dont want to expand low res image
            if (resizeLink) {
                resizeLink.addEventListener("click", (e) => {
                    // TODO: do this using revert tweak
                    let noteContainer = document.querySelector(".image-container.note-container");

                    // there is no note container on video pages
                    if (noteContainer) {
                        noteContainer.classList.remove("go-fit-height");

                        let image = document.querySelector("#image");
                        image.classList.remove("go-fit-height");
                        image.classList.add("fit-width");
                    } else {
                        let video = document.querySelector("#gelcomVideoPlayer");
                        video.classList.remove("go-fit-height");
                        video.classList.add("fit-width");
                    }
                });
            }
        });
    }
    function applyTweakPostEnlargeOnHover() {
        debugLog("Applying PostEnlargeOnHover");
        onDOMReady(() => {
            let divs = document.querySelectorAll(".mainBodyPadding > div");
            divs[divs.length - 1].querySelectorAll("a > img").forEach((i) => {
                i.classList.add("go-thumbnail-enlarge-post");
                if (configManager.config.thumbnails.preventEnlargeOffScreen) {
                    i.addEventListener("mouseenter", (e) => {
                        let elem = e.srcElement;
                        let rect = elem.getBoundingClientRect();
                        let xOrigin = rect.x + (rect.width / 2);

                        if (xOrigin - (rect.width * configManager.config.thumbnails.enlargeOnHoverScale / 2) <= 0) {
                            elem.style.transformOrigin = 'left';
                        } else if (xOrigin + (rect.width * configManager.config.thumbnails.enlargeOnHoverScale / 2) >= window.innerWidth) {
                            elem.style.transformOrigin = 'right';
                        } else {
                            elem.style.transformOrigin = '';
                        }
                        if (configManager.config.thumbnails.enlargeOnHoverHighRes) {
                            if (elem.src.includes("thumbnails")) {
                                loadPostItem(/id=([0-9]+)/.exec(i.parentElement.href)[1])
                                    .then((post) => elem.src = post.highResThumb)
                                    .catch((error) => debugLog("Failed to load highres image for following element with following error:", { elem, error }));
                            }
                        }
                    });
                }
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
                i.addEventListener("contextmenu", (e) => {
                    if (e.altKey)
                        return false;

                    e.preventDefault();
                    downloadPost(/id=([0-9]+)/.exec(i.parentElement.href)[1])
                        .catch(error => debugLog("Failed to download following post with following error", { post: i, error }));;
                });
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
                i.classList.add("go-thumbnail-enlarge");
                i.addEventListener("mouseenter", (e) => {
                    let elem = e.srcElement;
                    if (configManager.config.thumbnails.preventEnlargeOffScreen) {
                        let rect = elem.getBoundingClientRect();
                        let xOrigin = rect.x + (rect.width / 2);

                        if (xOrigin - (rect.width * configManager.config.thumbnails.enlargeOnHoverScale / 2) <= 0) {
                            elem.style.transformOrigin = 'left';
                        } else if (xOrigin + (rect.width * configManager.config.thumbnails.enlargeOnHoverScale / 2) >= window.innerWidth) {
                            elem.style.transformOrigin = 'right';
                        } else {
                            elem.style.transformOrigin = '';
                        }
                    }
                    if (configManager.config.thumbnails.enlargeOnHoverHighRes) {
                        if (elem.src.includes("thumbnails")) {
                            loadPostItem(elem.parentElement.id.substring(1))
                                .then((post) => elem.src = post.highResThumb)
                                .catch((error) => debugLog("Failed to load highres image for following element with following error:", { elem, error }));
                        }
                    }
                });
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
                i.addEventListener("contextmenu", (e) => {
                    debugLog(e.altKey);
                    if (e.altKey)
                        return false; // WHY THE CONTEXT MENU IS NOT DISPLAYING HERE???

                    e.preventDefault();
                    downloadPost(i.parentElement.id.substring(1))
                        .catch(error => debugLog("Failed to download following post with following error", { post: i, error }));
                });
            });
        });
    }
    // Functions
    function registerConfigWindow() {
        // config modal window
        let mainDiv = document.createElement("div");
        mainDiv.classList = "go-config-window go-config-window-hidden";
        mainDiv.id = "goConfigWindow";
        mainDiv.innerHTML = `
        <div class="go-config-window" id="goConfigWindow">
            <header>Gelbooru Overhaul</header>
            <ul>
                <li>
                    <h2>Preference category 1</h2>
                    <ul>
                        <li>
                            <input type="checkbox"></input>
                            <label class="block">Preference item 1</label>
                            <p>Preference info 1</p>
                        </li>
                        <li>
                            <input type="range"></input>
                            <labe class="block"l>Preference item 2</label>
                            <p>Preference info 2</p>
                        </li>
                    </ul>
                </li>
                <li>
                    <h2>Preference category 2</h2>
                    <ul>
                      <li>
                        <input type="checkbox"></input>
                        <label class="block">Preference item 3</label>
                        <p>Preference info 3</p>
                      </li>
                      <li>
                        <input type="range"></input>
                        <label class="block">Preference item 4</label>
                        <p>Preference info 4</p>
                      </li>
                    </ul>
                </li>
            </ul>
        </div>
    `;

        document.querySelector("#container").appendChild(mainDiv);

        // button to open window
        let settingsButton = document.createElement("a");
        settingsButton.text = "Overhaul";
        settingsButton.style = "cursor: pointer;";

        settingsButton.addEventListener("click", (e) => {
            mainDiv.classList.toggle("go-config-window-hidden");
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
        observer.observe(mainDiv, { attributes: true });

        let topnav = document.querySelector("#myTopnav");
        topnav.insertBefore(settingsButton, topnav.querySelectorAll("a")[1]);
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
            if (Object.keys(postCache).length > configManager.config.thumbnails.enlargeOnHoverHighResMaxCacheItems)
                postCache = {};

            if (!postCache[postId]) {
                fetch("https://gelbooru.com/index.php?page=post&s=view&id=" + postId)
                    .then(response => response.text())
                    .then(text => {
                        let parser = new DOMParser();
                        let htmlDocument = parser.parseFromString(text, "text/html");

                        let fileLink = htmlDocument.querySelector("meta[property='og:image']").content;
                        let highResThumb = htmlDocument.querySelector("video") ? fileLink.replace(new RegExp(/\.([^\.]+)$/, "gm"), ".jpg") : fileLink;
                        let md5 = htmlDocument.querySelector("video") ? "0".repeat(32) : htmlDocument.querySelector("section.image-container").getAttribute("data-md5");
                        // video have highRes thumbnail but does not have md5

                        let tags = {
                            artist:    [...htmlDocument.querySelectorAll(".tag-type-artist    > a")].map(i => i.text),
                            character: [...htmlDocument.querySelectorAll(".tag-type-character > a")].map(i => i.text),
                            copyright: [...htmlDocument.querySelectorAll(".tag-type-copyright > a")].map(i => i.text),
                            metadata:  [...htmlDocument.querySelectorAll(".tag-type-metadata  > a")].map(i => i.text),
                            general:   [...htmlDocument.querySelectorAll(".tag-type-general   > a")].map(i => i.text),
                        };

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

                    filename = filename.replace("%md5%",    post.md5);
                    filename = filename.replace("%postId%", postId);
                    filename = filename.replace("%artist%",    post.tags.artist.length ? post.tags.artist.join(", ")       : "unknown_artist");
                    filename = filename.replace("%character%", post.tags.character.length ? post.tags.character.join(", ") : "unknown_character");
                    filename = filename.replace("%copyright%", post.tags.copyright.length ? post.tags.copyright.join(", ") : "unknown_copyright");

                    filename = filename.replace(/[<>:"/\|?*]/g, "_"); // illegal chars

                    GM_download({
                        url: post.download,
                        name: filename + "." + post.download.split(".").at(-1),
                        saveAs: configManager.config.fastDL.saveAs,
                    });

                    if (configManager.config.fastDL.alsoSaveTags) {
                        let text = post.tags.artist.map(i => "artist:"    + i).join("\n") + "\n" +
                                post.tags.character.map(i => "character:" + i).join("\n") + "\n" +
                                post.tags.copyright.map(i => "series:"    + i).join("\n") + "\n" +
                                post.tags.metadata .map(i => "meta:"      + i).join("\n") + "\n" +
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
})();
