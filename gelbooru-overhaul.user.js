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
// @grant       GM_getResourceText
// @resource    css 	https://github.com/PetrK39/gelbooru-overhaul-userscript/raw/refactoring/gelbooru-overhaul.user.css
// @require     https://github.com/PetrK39/gelbooru-overhaul-userscript/raw/refactoring/gelbooru-overhaul.utils.css
// @require     https://github.com/PetrK39/gelbooru-overhaul-userscript/raw/refactoring/gelbooru-overhaul.configManager.css
// ==/UserScript==

(function () {
    "use strict";

    /**
     * @class Class that manages light/dark theme switching
     */
    class ThemeManager {
        isMatchMediaSupported = (window.matchMedia && window.matchMedia('(prefers-color-scheme)').media !== 'not all');
        constructor() {
            this.checkForThemeSwitch();
            this.applyCssThemeVariable();

            if (this.isMatchMediaSupported)
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", e => this.checkForThemeSwitch());

            this.scheduleCheckForThemeSwitch();

            let darkModeButton = Object.values(document.querySelectorAll("#myTopnav a")).filter(i => i.getAttribute("href").includes("javascript:;"))[0];
            darkModeButton.onclick = undefined;
            darkModeButton.setAttribute("title", "Click to force switch dark mode for current session\nRight click to clear force mode");
            darkModeButton.addEventListener("click", e => this.switchForceSessionMode());
            darkModeButton.addEventListener("contextmenu", e => this.clearForceSessionMode());
        }
        /**
         * @private
         * @returns {boolean} Get cookie for current darkmode
         */
        get forceSessionMode() {
            let cookie = utils.getCookie("force_dark_mode");
            if (cookie) return cookie == "true";
            else return undefined;
        }
        /**
         * @private
         * @param {boolean} value Set cookie for force darkmode
         */
        set forceSessionMode(value) {
            if (value == undefined) utils.clearCookie("force_dark_mode");
            else utils.setCookie("force_dark_mode", String(value));
        }
        /**
         * Checks if darkmode needs to be switched
         * @private
         */
        checkForThemeSwitch() {
            let isDarkModeRequired = this.isDarkModeRequired;

            if (isDarkModeRequired != this.isCurrentPageModeDark) {
                isDarkModeRequired ? this.applyDefaultDarkMode() : this.applyDefaultLightMode();
                this.applyCssThemeVariable();
            }
        }
        /**
         * Switch cookie for force darkmode
         * @private
         */
        switchForceSessionMode() {
            this.forceSessionMode = !this.forceSessionMode;
            this.checkForThemeSwitch();
        }
        /**
         * Clear cookie for force darkmode
         * @private
         */
        clearForceSessionMode() {
            this.forceSessionMode = undefined;
            this.checkForThemeSwitch();
        }
        /**
         * @private
         * @returns {boolean} Checks cookie for current darkmode
         */
        get isCurrentPageModeDark() {
            return Boolean(utils.getCookie("dark_mode"));
        }
        /**
         * @private
         * @returns {boolean} Required Dark Mode state
         */
        get isDarkModeRequired() {
            let forceSession = this.forceSessionMode;
            if (this.forceSessionMode != undefined) return forceSession;

            if (configManager.config.darkMode.items.force.value) {
                return true;
            } else if (configManager.config.darkMode.items.auto.value) {
                if (configManager.config.darkMode.items.forceTime.value || !this.isMatchMediaSupported) {
                    let hours = new Date().getHours();
                    return hours >= configManager.config.darkMode.items.timeStart.value || hours <= configManager.config.darkMode.items.timeEnd.value;
                } else {
                    return window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
            } else {
                return false;
            }
        }
        /**
         * applies default gelbooru light mode
         */
        applyDefaultLightMode() {
            debugLog("Applying default light mode");

            Object.values(document.head.querySelectorAll("link")).filter(i => i.href.includes("dark"))[0].remove();

            utils.clearCookie("dark_mode");
        }
        /**
         * applies default gelbooru dark mode
         */
        applyDefaultDarkMode() {
            debugLog("Applying default dark mode");

            let link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("type", "text/css");
            link.setAttribute("media", "screen");
            link.setAttribute("href", "gridStyle-dark.css?13f");
            link.setAttribute("title", "default");
            document.head.appendChild(link);

            utils.setCookie("dark_mode", "1");
        }
        applyCssThemeVariable() {
            debugLog("Applying css theme variable");

            onDOMReady(() => {
                /** @type {HTMLStyleElement} */
                let style = document.querySelector("#goThemeVariables");

                if (!style) {
                    style = document.createElement("style");
                    style.id = "goThemeVariables";
                    document.body.appendChild(style);
                }

                setTimeout(() => {
                    let bodyColor = window.getComputedStyle(document.body).backgroundColor;
                    style.innerHTML = `
                        :root {
                            --background-color: ${bodyColor == "rgba(0, 0, 0, 0)" ? "white" : bodyColor};
                        }
                    `;
                }, 100);
            });
        }
        scheduleCheckForThemeSwitch() {
            let date = new Date();
            if (date.getMinutes() === 0) {
                this.checkForThemeSwitch();
                setTimeout(() => this.scheduleCheckForThemeSwitch(), 60 * 60 * 1000);
            } else {
                setTimeout(() => this.scheduleCheckForThemeSwitch(), 60 * 60 * 1000 - date.getMinutes() * 60 * 1000);
            }
        }
    }
    /**
     * @class Class that manages blacklist features
     */
    class BlacklistManager {
        /**
         * @typedef  BlacklistEntry
         * @type     {Object}
         * @property {string}  tag        Blacklisted tag
         * @property {boolean} isAnd      Describes if entry includes multiple tags
         * @property {number}  hits       Displayed count of hits
         * @property {boolean} isDisabled Describes if entry is disabled
         * @property {HTMLElement} elem   Reference to displayed element
         * 
         * @typedef BlacklistItem
         * @type {Object}
         * @property {string} name
         * @property {string} value
         */
        /**
         * @type {BlacklistEntry[]}
         * @private
         */
        blacklistEntries;
        /**
         * @type {BlacklistItem}
         * @private
         */
        selectedBlacklistItem;

        constructor() {
            let item = { name: "Safe mode", value: "rating:q*\nrating:e*"};
            this.addUpdateBlacklist(item);
        }
        /**
         * @private
         * @returns {BlacklistItem[]} List of available blacklists
         */
        get blacklistItems() {
            return GM_getValue("blacklists", undefined);
        }
        /**
         * @private
         * @param {BlacklistItem[]} value
         */
        set blacklistItems(value) {
            GM_setValue("blacklists", value);
        }
        /**
         * Adds/updates blacklist item to storage
         * @param {BlacklistItem} item 
         * @private
         */
        addUpdateBlacklist(item) { 
            let items = this.blacklistItems;

            if(!items)
                items = [];

            let index = items.findIndex(i => i.name == item.name);

            if(index == -1) {
                items.push(item);
            } else {
                items[index] = item;
            }

            this.blacklistItems = items;

            this.updateSidebar();
        }
        /**
         * Removes blacklist item from storage
         * @param {BlacklistItem} item 
         * @private
         */
        removeBlacklist(item) { 
            let index = this.blacklistItems.findIndex(i => i.name == item.name);

            this.blacklistItems.splice(index, 1);

            this.updateSidebar();
        }

        /**
         * Parse current blacklist item's entries
         */
        parseEntries() { }

        /**
         * Updates blacklist sidebar placed above tags sidebar
         * @private
         */
        updateSidebar() {
            let aside = document.querySelector(".aside");
            let titleSpan = aside.querySelector("#go-advBlacklistTitle");
            let select = aside.querySelector("#go-advBlacklistSelect");

            if (titleSpan) {
                //update
            } else {
                //title
                titleSpan = document.createElement("span");
                titleSpan.id = "go-advBlacklistTitle";

                titleSpan.appendChild(document.createElement("br"));

                let b = document.createElement("b");
                b.textContent = "Blacklist";
                b.style = "margin-left: 15px;";
                titleSpan.appendChild(b);

                titleSpan.appendChild(document.createElement("br"));
                titleSpan.appendChild(document.createElement("br"));


                //dropdown
                select = document.createElement("select");
                select.id = "go-advBlacklistSelect";

                if (this.blacklistItems && this.blacklistItems.length > 0) {
                    this.blacklistItems.forEach(i => {
                        let opt = document.createElement("option");
                        opt.value = i.name;
                        opt.textContent = i.name;
                        select.appendChild(opt);
                    });
                } else {
                    let opt = document.createElement("option");
                    opt.value = "There is no blacklists";
                    opt.textContent  = "There is no blacklists";
                    select.appendChild(opt);
                    select.setAttribute("disabled", "");
                }

                aside.insertBefore(select, aside.children[0]);
                aside.insertBefore(titleSpan, select);

            }
        }
        /**
         * Removes blacklist sidebar placed above tags sidebar
         * @private
         */
        removeSidebar() {
            let aside = document.querySelector(".aside");
            let title = aside.querySelector("#go-advBlacklistTitle");

            if (title) {
                title.remove();
            }
        }
        /**
         * Enable/disable blacklist manager
         * @param {boolean} value 
         * @public
         */
        setupManager(value) {
            if (value) {
                this.updateSidebar();
            } else {
                this.removeSidebar();
            }
        }
    }
    /** @var {Object.<string, string>} Enum with available page types */
    const PageTypes = Object.freeze({ GALLERY: "gallery", POST: "post", WIKI_VIEW: "wiki_view", POOL_VIEW: "pool_view", UNDEFINED: "undefined" });

    let currentPageType = getPageType();
    debugLog("Current page type is " + currentPageType, null, true);

    let configManager = new ConfigManager();
    configManager.loadConfig();

    let themeManager = new ThemeManager();
    let blacklistManager = new BlacklistManager();

    configManager.addUpdateListener("collapsibleSidebar.items.enable", applyTweakCollapseSidebar);

    configManager.applyConfig();

    debugLog("Registering styles");
    GM_addStyle(GM_getResourceText("css"));

    debugLog("Registering config window");
    registerConfigWindow();

    // lazy fix for the back button, don't want to deal with HTML5 stuff
    window.onpopstate = function (event) {
        if (event && event.state) {
            location.reload();
        }
    };

    // Apply CSS Variables
    /** @type {PreferenceUpdateCallback} */
    function applyCssVariableGoCollapseSidebar() {
        debugLog("Applying css variable .go-collapse-sidebar");

        onDOMReady(() => {
            /** @type {HTMLStyleElement} */
            let style = document.querySelector("#goCollapseSidebarVariables");

            if (!style) {
                style = document.createElement("style");
                style.id = "goCollapseSidebarVariables";
                document.body.appendChild(style);
            }

            style.innerHTML = `
            .go-collapse-sidebar {
                --collapsed-width: ${configManager.config.collapsibleSidebar.items.width.value};
                --collapsed-color: ${configManager.config.collapsibleSidebar.items.color.value};
                --expanded-opacity: ${configManager.config.collapsibleSidebar.items.opacity.value};
            }
            .go-collapse-sidebar-container-tweak {
                --collapsed-width: ${configManager.config.collapsibleSidebar.items.width.value};
            }
            `;
        });
    }
    /** @type {PreferenceUpdateCallback} */
    function applyCssVariableGoThumbnailEnlarge() {
        debugLog("Applying css variable .go-thumbnail-enlarge");

        onDOMReady(() => {
            /** @type {HTMLStyleElement} */
            let style = document.querySelector("#goThumbnailEnlargeVariables");

            if (!style) {
                style = document.createElement("style");
                style.id = "goThumbnailEnlargeVariables";
                document.body.appendChild(style);
            }

            style.innerHTML = `
            .go-thumbnail-enlarge {
                --enlarge-scale: ${configManager.config.thumbs.items.scale.value};
            }
            `;
        });
    }
    /** @type {PreferenceUpdateCallback} */
    function applyCssVariableGoThumbnailResize() {
        debugLog("Applying css variable .go-thumbnail-resize");

        onDOMReady(() => {
            /** @type {HTMLStyleElement} */
            let style = document.querySelector("#goThumbnailResizeVariables");

            if (!style) {
                style = document.createElement("style");
                style.id = "goThumbnailResizeVariables";
                document.body.appendChild(style);
            }

            style.innerHTML = `
            .go-thumbnail-resize {
                --thumb-gallery-size: ${configManager.config.thumbs.items.resizeGallerySize.value};
                --thumb-morelikethis-size: ${configManager.config.thumbs.items.resizeMoreLikeThisSize.value};
            }
            `;
        });
    }

    // Apply Tweak
    //      Collapsible sidebar
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakCollapseSidebar(value) {
        if (![PageTypes.GALLERY, PageTypes.POST].includes(currentPageType)) return;

        debugLog(`Applying TweakCollapseSidebar state: ${String(value)}`);
        onDOMReady(() => {
            document.querySelector("#container > section").classList.toggle("go-collapse-sidebar", value);
            document.querySelector("#tag-list").classList.toggle("go-tag-list-top-bottom-padding", value);

            document.querySelectorAll("#tag-list > li[class^='tag-type']").forEach((i) => { i.classList.toggle("go-collapse-sidebar-tags-list-tweak", value); });
            document.querySelector("#container").classList.toggle("go-collapse-sidebar-container-tweak", value);
            Object.values(document.getElementsByClassName("mobile-spacing")).forEach((i) => { i.classList.toggle("go-mobile-unspacing", value); });
            Object.values(document.getElementsByClassName("sm-hidden")).forEach((i) => { i.classList.toggle("go-sm-unhidden", value); });
        });
    }
    //      Post
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostFit(value) {
        if (currentPageType != PageTypes.POST) return;
        debugLog(`Applying PostFit state: ${String(value)}`);

        onDOMReady(() => {
            document.querySelectorAll(".note-container, #image, #gelcomVideoPlayer").forEach(i => {
                i.classList.toggle("go-fit-height", value);
                i.classList.toggle("fit-width", !value);
            });

            let resizeLink = document.querySelector("#resize-link > a");
            if (resizeLink) {
                if (value)
                    resizeLink.addEventListener("click", toggleFitMode);
                else
                    resizeLink.removeEventListener("click", toggleFitMode);
            }
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostCenter(value) {
        if (currentPageType != PageTypes.POST) return;
        debugLog(`Applying PostCenter state: ${String(value)}`);

        onDOMReady(() => {
            document.querySelectorAll(".note-container, #image, #gelcomVideoPlayer").forEach(i => {
                i.classList.toggle("go-center", value);
            });
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostAutoScroll(value) {
        if (currentPageType != PageTypes.POST) return;
        debugLog(`Applying PostAutoScroll state: ${String(value)}`);

        if (value)
            document.addEventListener("readystatechange", autoScroll);
        else
            document.removeEventListener("readystatechange", autoScroll);
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostOnNarrow(value) {
        if (currentPageType != PageTypes.POST) return;
        debugLog(`Applying PostOnNarrow state: ${String(value)}`);

        onDOMReady(() => {
            document.querySelectorAll(".note-container, #image, #gelcomVideoPlayer").forEach(i => {
                i.classList.toggle("go-fit-width-on-narrow", value);
            });
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostClickSwitchFit(value) {
        if (currentPageType != PageTypes.POST) return;
        debugLog(`Applying PostClickSwitchFit state: ${String(value)}`);

        onDOMReady(() => {
            let img = document.querySelector("#image");
            let resizeLink = document.querySelector("#resize-link > a");

            if (!img || !resizeLink)
                return;

            if (value) {
                img.classList.add("go-cursor-zoom-in");
                img.addEventListener("click", toggleFitModeWithCursors);
            } else {
                img.classList.remove("go-cursor-zoom-in");
                img.classList.remove("go-cursor-zoom-out");
                img.removeEventListener("click", toggleFitModeWithCursors);
            }
        });
    }
    //      Thumbs
    /**
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakEnlargeOnHover(value) {
        if (![PageTypes.GALLERY, PageTypes.POST].includes(currentPageType)) return;

        debugLog(`Applying EnlargeOnHover state: ${String(value)}`);
        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                i.parentElement.classList.toggle("go-thumbnail-enlarge", value);

                if (currentPageType == PageTypes.POST)
                    i.style.margin = '';
                i.parentElement.style.margin = '10px'; //TODO: css
            });
        });

        // Dependent tweak
        applyTweakLoadHighRes(Boolean(configManager.config.thumbs.items.highRes.value));
        applyTweakPreventOffScreen(Boolean(configManager.config.thumbs.items.preventOffScreen.value));
    }
    /** 
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakLoadHighRes(value) {
        if (![PageTypes.GALLERY, PageTypes.POST].includes(currentPageType)) return;

        // Dependencies check
        let dependValue = configManager.config.thumbs.items.enlargeOnHover.value && value;

        debugLog(`Applying LoadHighRes state: ${String(dependValue)}`);

        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                if (dependValue) {
                    i.setAttribute("data-thumb-src", i.src);
                    i.addEventListener("mouseenter", setImageHighResSource);
                    i.addEventListener("mouseleave", setImageLowResSource);
                } else {
                    i.removeEventListener("mouseenter", setImageHighResSource);
                    i.removeEventListener("mouseleave", setImageLowResSource);
                }
            });
        });

        // Dependent tweak
        applyTweakLoadingIndicator(Boolean(configManager.config.thumbs.items.loader.value));
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakLoadingIndicator(value) {
        if (![PageTypes.GALLERY, PageTypes.POST].includes(currentPageType)) return;

        // Dependencies check
        let dependValue = configManager.config.thumbs.items.enlargeOnHover.value &&
            configManager.config.thumbs.items.highRes.value && value;

        debugLog(`Applying LoadingIndicator state: ${String(dependValue)}`);

        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                if (dependValue) {
                    i.addEventListener("mouseenter", addLoadingIndicator);
                } else {
                    i.removeEventListener("mouseenter", addLoadingIndicator);
                }
            });
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakPreventOffScreen(value) {
        if (![PageTypes.GALLERY, PageTypes.POST].includes(currentPageType)) return;

        // Dependencies check
        let dependValue = configManager.config.thumbs.items.enlargeOnHover.value && value;

        debugLog(`Applying PreventOffScreen state: ${String(dependValue)}`);

        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                if (dependValue) {
                    i.parentElement.addEventListener("mouseenter", updateTransformOrigin);
                } else {
                    i.parentElement.removeEventListener("mouseenter", updateTransformOrigin);
                    i.parentElement.style.transformOrigin = "";
                }
            });
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakRoundCorners(value) {
        if (![PageTypes.GALLERY, PageTypes.POST].includes(currentPageType)) return;

        debugLog(`Applying RoundCorners state: ${String(value)}`);

        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                i.classList.toggle("go-thumbnail-corners", value);
            });
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakRemoveTitle(value) {
        if (PageTypes.GALLERY != currentPageType) return;

        debugLog(`Applying RemoveTitle state: ${String(value)}`);

        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                if (value) {
                    i.setAttribute("data-title", i.getAttribute("title"));
                    i.removeAttribute("title");
                } else {
                    i.setAttribute("title", i.getAttribute("data-title"));
                    i.removeAttribute("data-title");
                }
            });
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakResizeThumbsGallery(value) {
        if (PageTypes.GALLERY != currentPageType) return;

        debugLog(`Applying ResizeThumbGallery state: ${String(value)}`);

        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                i.classList.toggle("go-thumbnail-resize", value);
                i.parentElement.parentElement.classList.toggle("go-thumbnail-resize", value); // img < a < (article) < div.thumbnail-container
            });
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakResizeThumbsMoreLikeThis(value) {
        if (PageTypes.POST != currentPageType) return;

        debugLog(`Applying ResizeThumbMoreLikeThis state: ${String(value)}`);

        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                i.classList.toggle("go-thumbnail-resize", value);
            });
        });
    }
    //      FastDL
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakFastDL(value) {
        if (![PageTypes.GALLERY, PageTypes.POST].includes(currentPageType)) return;

        debugLog(`Applying FastDL state: ${String(value)}`);

        onDOMReady(() => {
            getThumbnails().forEach((i) => {
                if (value) {
                    i.addEventListener("contextmenu", downloadThumbWithRMB);
                } else {
                    i.removeEventListener("contextmenu", downloadThumbWithRMB);
                }
            });
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakFastDLPost(value) {
        if (currentPageType != PageTypes.POST) return;

        debugLog(`Applying FastDLPost state: ${String(value)}`);

        onDOMReady(() => {
            let post = document.querySelector("#gelcomVideoPlayer, #image");
            if (value) {
                post.addEventListener("contextmenu", downloadPostWithRMB);
            } else {
                post.removeEventListener("contextmenu", downloadPostWithRMB);
            }
        });
    }
    //      Infinite Scroll
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakInfiniteScroll(value) {
        if (currentPageType != PageTypes.GALLERY) return;

        debugLog(`Applying InfiniteScroll state: ${String(value)}`);
        onDOMReady(() => {
            if (value)
                document.addEventListener("scroll", checkApplyInfiniteScroll);
            else
                document.removeEventListener("scroll", checkApplyInfiniteScroll);
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakPaginatorOnTop(value) {
        if (currentPageType != PageTypes.GALLERY) return;

        debugLog(`Applying InfiniteScroll state: ${String(value)}`);

        onDOMReady(() => {
            if (value) {
                if (document.querySelector(".top-pagination")) return;

                /** @type {HTMLElement} */
                let topPagination = document.querySelector(".pagination").cloneNode(true);
                topPagination.classList.add("top-pagination");
                document.querySelector("main").insertBefore(topPagination, document.querySelector(".thumbnail-container"));
            } else {
                document.querySelector(".top-pagination").remove();
            }
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakGoToTop(value) {
        if (currentPageType != PageTypes.GALLERY) return;

        debugLog(`Applying InfiniteScroll state: ${String(value)}`);

        onDOMReady(() => {
            if (value) {
                let goTopDiv = document.createElement("div");
                let goTopA = document.createElement("a");

                goTopDiv.className = "alert alert-info";
                goTopDiv.id = "go-top";
                goTopDiv.addEventListener("click", () => window.scrollTo({ top: 0, behavior: 'smooth' }));

                goTopA.textContent = "Go Top";

                goTopDiv.appendChild(goTopA);
                document.body.appendChild(goTopDiv);
            } else {
                document.querySelector("#go-top").remove();
            }
        });
    }
    //      Advanced Blacklist
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakAdvancedBlacklist(value) {
        blacklistManager.setupManager(value);
    }
    // Functions
    //      Script
    /**
    * Runs func when document is ready
    * @param {function} func 
    */
    function onDOMReady(func) {
        if (document.readyState == "interactive" || document.readyState == "complete") {
            func();
        } else {
            document.addEventListener("DOMContentLoaded", () => func());
        }
    }
    function registerConfigWindow() {

        // config modal window
        let sDiv = buildSettingsWindow(configManager.config);

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
            settingsButton.style.cursor = "pointer";

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
        /**
         * Build config window div
         * @param {Preferences} prefs 
         * @returns {HTMLDivElement} Config window div element
         */
        function buildSettingsWindow(prefs) {
            /** @type {HTMLDivElement} */
            let sDiv = document.createElement("div");
            sDiv.className = "go-config-window go-config-window-hidden";
            sDiv.id = "goConfigWindow";

            let header = document.createElement("header");
            header.className = "topnav";
            let headerA = document.createElement("a");
            headerA.textContent = "Gelbooru Overhaul";
            header.appendChild(headerA);

            let footer = document.createElement("footer");
            let submitClose = document.createElement("input");
            submitClose.type = "submit";
            submitClose.className = "searchList";
            submitClose.value = "Close";
            submitClose.title = "Close window without saving";
            submitClose.addEventListener("click", () => {
                configManager.loadConfig();
                configManager.applyConfig();
                sDiv.classList.add("go-config-window-hidden");
            });

            let submitSave = document.createElement("input");
            submitSave.type = "submit";
            submitSave.className = "searchList";
            submitSave.value = "Save";
            submitSave.title = "Save changes and close window";
            submitSave.addEventListener("click", () => {
                sDiv.classList.add("go-config-window-hidden");
                configManager.saveConfig();
                configManager.applyConfig();
            });

            let submitRevert = document.createElement("input");
            submitRevert.type = "submit";
            submitRevert.className = "searchList";
            submitRevert.value = "Revert";
            submitRevert.title = "Cancel unsaved changes";
            submitRevert.addEventListener("click", () => {
                configManager.loadConfig();
                configManager.applyConfig();
                updateInputValues();
            });

            let submitDefaults = document.createElement("input");
            submitDefaults.type = "submit";
            submitDefaults.className = "searchList";
            submitDefaults.value = "Defaults";
            submitDefaults.title = "Reset config storage and load default config";
            submitDefaults.addEventListener("click", () => {
                configManager.setDefaultConfig();
                configManager.applyConfig();
                updateInputValues();
            });

            footer.appendChild(submitClose);
            footer.appendChild(submitSave);
            footer.appendChild(submitRevert);
            footer.appendChild(submitDefaults);

            sDiv.appendChild(header);
            sDiv.appendChild(buildSettingsTemplate(prefs));
            sDiv.appendChild(footer);

            return sDiv;
        }
        /**
         * Template for main config window content
         * @param {Preferences} prefs 
         * @returns {HTMLDListElement}
         */
        function buildSettingsTemplate(prefs) {
            let dl = document.createElement("dl");
            Object.values(prefs).map(buildPrefCatTemplate).forEach(i => {
                dl.appendChild(i.dt);
                dl.appendChild(i.dd);
            });

            return dl;
        }
        /**
         * Template for PreferenceCategory
         * @param {PreferenceCategory} prefCat 
         * @returns {{dt: HTMLElement, dd: HTMLElement}}
         */
        function buildPrefCatTemplate(prefCat) {
            let dt = document.createElement("dt");
            let h3 = document.createElement("h3");
            h3.textContent = prefCat.name;
            dt.appendChild(h3);

            let dd = document.createElement("dd");
            let ul = document.createElement("ul");
            Object.entries(prefCat.items).map(buildPrefItemTemplate).forEach(i => ul.appendChild(i));
            dd.appendChild(ul);

            return { dt: dt, dd: dd };
        }
        /**
         * Template for PreferenceItem
         * @param {[String, PreferenceItem]} pref
         * @returns {HTMLLIElement} 
         */
        function buildPrefItemTemplate(pref) {
            let type = typeof (pref[1].value);
            let li = document.createElement("li");

            switch (type) {
                case "boolean":
                    li.className = "checkbox-input";

                    let inputBool = document.createElement("input");
                    inputBool.type = "checkbox";
                    inputBool.id = utils.findPath(configManager.config, pref[0], pref[1]).substring(1);
                    inputBool.name = pref[1].name;
                    inputBool.checked = Boolean(pref[1].value);
                    inputBool.disabled = pref[1].locked;
                    inputBool.addEventListener("input", /** @param {InputEvent} e */ e => updatePreferenceItem(e, pref[1]));

                    let labelBool = document.createElement("label");
                    labelBool.htmlFor = pref[1].name;
                    labelBool.textContent = pref[1].name;

                    let pBool = document.createElement("p");
                    pBool.textContent = pref[1].description;

                    li.appendChild(inputBool);
                    li.appendChild(labelBool);
                    li.appendChild(pBool);
                    break;
                case "string":
                case "number":
                    li.className = "text-input";

                    let labelText = document.createElement("label");
                    labelText.htmlFor = pref[1].name;
                    labelText.textContent = pref[1].name;

                    let inputText = document.createElement("input");
                    inputText.type = "text";
                    inputText.id = utils.findPath(configManager.config, pref[0], pref[1]).substring(1);
                    inputText.name = pref[1].name;
                    inputText.value = String(pref[1].value);
                    inputText.disabled = pref[1].locked;

                    let debouncedUpdate = utils.debounce(updatePreferenceItem, 3000);
                    inputText.addEventListener("input", /** @param {InputEvent} e */ e => debouncedUpdate(e, pref[1]));

                    let pText = document.createElement("p");
                    pText.textContent = pref[1].description;

                    li.appendChild(labelText);
                    li.appendChild(inputText);
                    li.appendChild(pText);
                    break;
                default:
                    throw new TypeError(`Unknown type ${type} of ${pref}`);
            }
            return li;
        }
        function updateInputValues() {
            document.querySelectorAll("#goConfigWindow input:not([type='submit'])").forEach(/** @param {HTMLInputElement} i */ i => {
                switch (i.type) {
                    case "checkbox":
                        i.checked = utils.resolve(i.id + ".value", configManager.config);
                        break;

                    case "text":
                        i.value = utils.resolve(i.id + ".value", configManager.config);
                        break;
                }
            });
        }
    }
    /**
     * Current page type (see {@link PageTypes})
     * @returns {string}
     */
    function getPageType() {
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
    /** 
     * @typedef PostItem
     * @property {string} highResThumb - high resolution thumb url (image/animated gif/video preview)
     * @property {string} download - download url (original image/gif/video)
     * @property {Object} tags - list of tags by category
     * @property {string[]} tags.artist - artist tags (can be empty)
     * @property {string[]} tags.character - character tags (can be empty)
     * @property {string[]} tags.copyright - copyright tags (can be empty)
     * @property {string[]} tags.metadata - metadata tags (can be empty)
     * @property {string[]} tags.general - general tags (can be empty)
     * @property {string} md5 - md5 for file (0's for video)
     * @property {number} id - post id
     */
    /**
     * Cache and return post item
     * @param {number} postId 
     * @returns {Promise<PostItem>}
     */
    function loadPostItem(postId) {
        return new Promise((resolve, reject) => {
            /** @type {Object<number, PostItem} */
            let postCache = GM_getValue("postCache", {});

            // just clear postCache if exceeded limit
            if (Object.keys(postCache).length > configManager.config.general.items.maxCache.value)
                postCache = {};

            if (!postCache[postId]) {
                fetch("https://" + window.location.host + "/index.php?page=post&s=view&id=" + postId)
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
                            artist: [...htmlDocument.querySelectorAll(".tag-type-artist       > a")].map(i => i.text),
                            character: [...htmlDocument.querySelectorAll(".tag-type-character > a")].map(i => i.text),
                            copyright: [...htmlDocument.querySelectorAll(".tag-type-copyright > a")].map(i => i.text),
                            metadata: [...htmlDocument.querySelectorAll(".tag-type-metadata   > a")].map(i => i.text),
                            general: [...htmlDocument.querySelectorAll(".tag-type-general     > a")].map(i => i.text),
                        };

                        if (!highResThumb || !fileLink) throw new Error("Failed to parse url");

                        postCache[postId] = {
                            highResThumb: highResThumb,
                            download: fileLink,
                            tags: tags,
                            md5: md5,
                            id: postId
                        };
                        GM_setValue("postCache", postCache);
                        resolve(postCache[postId]);
                    })
                    .catch(error => reject(error));
            } else {
                resolve(postCache[postId]);
            }
        });
    }
    /**
     * 
     * @param {PostItem} post 
     * @returns {Promise}
     */
    function downloadPostItem(post) {
        return new Promise((resolve, reject) => {
            //build filename
            let filename = String(configManager.config.fastDL.items.pattern.value);
            let spr = String(configManager.config.fastDL.items.separator.value);

            filename = filename.replace("%md5%", post.md5);
            filename = filename.replace("%postId%", String(post.id));
            filename = filename.replace("%artist%", post.tags.artist.length ? post.tags.artist.join(spr) : "unknown_artist");
            filename = filename.replace("%character%", post.tags.character.length ? post.tags.character.join(spr) : "unknown_character");
            filename = filename.replace("%copyright%", post.tags.copyright.length ? post.tags.copyright.join(spr) : "unknown_copyright");

            filename = filename.replace(/[<>:"/\|?*]/, "_"); // illegal chars

            GM_download({
                url: post.download,
                name: filename + "." + post.download.split(".").at(-1),
                saveAs: configManager.config.fastDL.items.saveAs.value,
                onload: resolve("Download finished"),
                onerror: (error, details) => reject({ error, details }),
            });

            if (configManager.config.fastDL.items.saveTags.value) {
                let text = post.tags.artist.map(i => "artist:" + i).join("\n") + "\n" +
                    post.tags.character.map(i => "character:" + i).join("\n") + "\n" +
                    post.tags.copyright.map(i => "series:" + i).join("\n") + "\n" +
                    post.tags.metadata.map(i => "meta:" + i).join("\n") + "\n" +
                    post.tags.general.join("\n") + "\n";

                text = text.replaceAll("\n\n", "\n");

                let elem = document.createElement("a");
                elem.href = "data:text," + encodeURIComponent(text);
                elem.download = filename + ".txt";
                elem.click();
            }
            debugLog("Downloading started", { url: post.download, filename });
        });
    }
    /**
     * 
     * @param {number} postId
     */
    function downloadPostById(postId) {
        loadPostItem(postId)
            .then(p => downloadPostItem(p)
                .then(() => debugLog("Post item successfully downloaded", p))
                .catch((r) => debugLog("Failed to download post item", { post: p, error: r.error, details: r.details })))
            .catch(e => debugLog("Failed to load post item for", { post: e.target, id: postId, error: e }));
    }
    /**
     * Updating and applying preference item value
     * @param {Object} e 
     * @param {HTMLInputElement} e.target
     * @param {PreferenceItem} pref
     */
    function updatePreferenceItem(e, pref) {
        let value = e.target.type == "checkbox" ? e.target.checked : e.target.value;
        debugLog("Updating prefItem with value", { pref, value });

        pref.value = value;
        if (pref.update) pref.update(pref.value);
    }
    /**
     * Returns thumbnails from current page
     * @returns {NodeListOf<HTMLImageElement>}
     */
    function getThumbnails() {
        switch (currentPageType) {
            case PageTypes.GALLERY:
                return document.querySelectorAll(".thumbnail-preview > a > img");
            case PageTypes.POST:
                return document.querySelectorAll(".mainBodyPadding > div:last-of-type > a > img");
            default:
                return undefined;
        }
    }


    //      Tweak
    /**
     * @param {MouseEvent} e
     */
    function setImageHighResSource(e) {
        /** @type {HTMLImageElement} */
        let img = e.target;
        loadPostItem(/id=([0-9]+)/.exec(img.parentElement.getAttribute("href"))[1])
            .then((post) => img.src = post.highResThumb)
            .catch((error) => debugLog("Failed to load highres image for following element with following error:", { img, error }));

    }
    /**
     * @param {MouseEvent} e
     */
    function setImageLowResSource(e) {
        /** @type {HTMLImageElement} */
        let img = e.target;
        if (img.complete)
            img.src = img.getAttribute("data-thumb-src");
        else
            img.addEventListener("load", () => img.src = img.getAttribute("data-thumb-src"), { once: true });

    }
    function autoScroll() {
        /** @type {HTMLImageElement} */
        let image = document.querySelector("#image");

        if (image) {
            // only if image fit window
            debugLog(`Height is ${window.innerHeight} vs ${image.height}`);
            debugLog(`Width  is ${window.innerWidth} vs ${image.width}`);

            if (window.innerHeight > image.height && window.innerWidth > image.width) {
                debugLog("Scrolling");
                image.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
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
        noteContainer.classList.toggle("go-fit-width");

        /** @type {HTMLImageElement} */
        let image = noteContainer.querySelector("#image");
        image.classList.toggle("go-fit-height");
        image.classList.toggle("go-fit-width");

        image.style.width = "";
        image.style.height = "";
        image.removeAttribute("width");
        image.removeAttribute("height");

        /** @type {HTMLDivElement} */
        let resizeLink = document.querySelector("#resize-link");
        resizeLink.style.display = "";
    }
    /**
     * @param {MouseEvent} e
     */
    function updateTransformOrigin(e) {
        /** @type {HTMLElement} */
        let elem = e.target;
        let rect = elem.getBoundingClientRect();
        let xOrigin = rect.x + (rect.width / 2);

        if (xOrigin - (rect.width * Number(configManager.config.thumbs.items.scale.value) / 2) <= window.innerWidth * 0.01) {
            elem.style.transformOrigin = 'left';
        } else if (xOrigin + (rect.width * Number(configManager.config.thumbs.items.scale.value) / 2) >= window.innerWidth * 0.99) {
            elem.style.transformOrigin = 'right';
        } else {
            elem.style.transformOrigin = '';
        }
    }
    /**
     * @param {MouseEvent} e
     */
    function addLoadingIndicator(e) {
        e.target.parentElement.classList.add("go-loader");
        e.target.addEventListener("load", ee => {
            ee.target.parentElement.classList.remove("go-loader");
        }, { once: true });
    }
    /**
     * FastDL contextmenu event listener
     * @param {MouseEvent} e
     */
    function downloadThumbWithRMB(e) {
        if (e.shiftKey) {
            return;
        }

        e.preventDefault();

        let postId = Number(/id=([0-9]+)/.exec(e.target.parentElement.getAttribute("href"))[1]);
        downloadPostById(postId);
    }
    /**
     * FastDL contextmenu event listener
     * @param {MouseEvent} e
     */
    function downloadPostWithRMB(e) {
        if (e.shiftKey) {
            return;
        }

        e.preventDefault();

        let postId = Number(/id=([0-9]+)/.exec(document.location.href)[1]);
        downloadPostById(postId);
    }
    /**
     * 
     * @param {MouseEvent} e 
     */
    function toggleFitModeWithCursors(e) {
        /** @type {HTMLAnchorElement} */
        let resizeLink = document.querySelector("#resize-link > a");
        resizeLink.click();

        e.target.classList.toggle("go-cursor-zoom-in");
        e.target.classList.toggle("go-cursor-zoom-out");
    }
    /**
     * Infinite scroll event listener
     * @param {Event} e 
     */
    function checkApplyInfiniteScroll(e) {
        const threshold = Number(configManager.config.infiniteScroll.items.threshold.value);
        if (document.scrollingElement.scrollTop + document.scrollingElement.clientHeight >= document.scrollingElement.scrollHeight - threshold) {
            if (!this.throttledScroll) this.throttledScroll = utils.debounceFirst(applyInfiniteScroll, 1000);
            this.throttledScroll();
        }
    }
    /**
     * Main InfiniteScroll function
     */
    let isInfiniteScrollHitLastPage = false;
    function applyInfiniteScroll() {
        if (isInfiniteScrollHitLastPage) return;

        let params = new URLSearchParams(document.URL.split('?')[1]);
        params.has("pid") ? params.set("pid", String(Number(params.get("pid")) + 42)) : params.set("pid", String(42));
        let nextPage = document.location.pathname + "?" + params;
        //document.querySelector("#paginator > a[alt='next']").getAttribute("href");
        debugLog(`InfScrolling to pid ${params.get("pid")}`);

        fetch(nextPage)
            .then(response => {
                if (!response.ok) throw Error(response.statusText);
                return response.text();
            })
            .then(text => {
                let parser = new DOMParser();
                let htmlDocument = parser.parseFromString(text, "text/html");

                let newThumbContainer = htmlDocument.querySelector(".thumbnail-container");
                let oldThumbContainer = document.querySelector(".thumbnail-container");
                let firstOldThumb = oldThumbContainer.children[0];

                if (!newThumbContainer.childElementCount) {
                    debugLog("InfScrolling hit last page");
                    isInfiniteScrollHitLastPage = true;
                    return;
                }

                Object.values(newThumbContainer.children).forEach(t => {
                    oldThumbContainer.appendChild(t);
                });

                // reapply tweaks related to gallery page
                // some of them has dependent tweaks, skip it
                applyTweakEnlargeOnHover(Boolean(configManager.config.thumbs.items.enlargeOnHover.value));
                applyTweakLoadingIndicator(Boolean(configManager.config.thumbs.items.loader.value));
                applyTweakRoundCorners(Boolean(configManager.config.thumbs.items.roundCorners.value));
                applyTweakRemoveTitle(Boolean(configManager.config.thumbs.items.removeTitle.value));
                applyTweakFastDL(Boolean(configManager.config.fastDL.items.thumbs.value));
                applyTweakResizeThumbsGallery(Boolean(configManager.config.thumbs.items.resizeGallery.value));

                let newPaginator = htmlDocument.querySelector(".pagination");
                let oldPaginator = document.querySelector(".pagination:not(.top-pagination)");
                oldPaginator.replaceWith(newPaginator);

                let oldTopPaginator = document.querySelector(".top-pagination");
                if (oldTopPaginator) {
                    /** @type {HTMLElement} */
                    let newTopPaginator = newPaginator.cloneNode(true);
                    newTopPaginator.classList.add("top-pagination");
                    oldTopPaginator.replaceWith(newTopPaginator);
                }

                window.history.pushState(nextPage, htmlDocument.title, nextPage);
                history.scrollRestoration = 'manual';
                document.title = htmlDocument.title;
            });
    }
    
})();
