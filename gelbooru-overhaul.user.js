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
// @resource    css 	https://github.com/PetrK39/gelbooru-overhaul-userscript/raw/refactoring/gelbooru-overhaul.css
// @require     https://github.com/PetrK39/gelbooru-overhaul-userscript/raw/refactoring/gelbooru-overhaul.utils.js
// @require     https://github.com/PetrK39/gelbooru-overhaul-userscript/raw/refactoring/gelbooru-overhaul.configManager.js
// @require     https://github.com/PetrK39/gelbooru-overhaul-userscript/raw/refactoring/gelbooru-overhaul.blacklistManager.js
// @require     https://github.com/PetrK39/gelbooru-overhaul-userscript/raw/refactoring/gelbooru-overhaul.infiniteScrolling.js
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

            if (configManager.findValueByKey("darkMode.force")) {
                return true;
            } else if (configManager.findValueByKey("darkMode.auto")) {
                if (configManager.findValueByKey("darkMode.forceTime") || !this.isMatchMediaSupported) {
                    let hours = new Date().getHours();
                    return hours >= configManager.findValueByKey("darkMode.timeStart") || hours <= configManager.findValueByKey("darkMode.timeEnd");
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
            utils.debugLog("Applying default light mode");

            Object.values(document.head.querySelectorAll("link")).filter(i => i.href.includes("dark"))[0].remove();

            utils.clearCookie("dark_mode");
        }
        /**
         * applies default gelbooru dark mode
         */
        applyDefaultDarkMode() {
            utils.debugLog("Applying default dark mode");

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
            utils.debugLog("Applying css theme variable");

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
    /** @type {string} */
    let currentPageType;

    /** @type {ConfigManager} */
    let configManager;
    /** @type {ThemeManager} */
    let themeManager;
    /** @type {BlacklistManager} */
    let blacklistManager;
    /** @type {InfiniteScrolling} */
    let infiniteScrolling;

    let blackoutStyle = GM_addStyle(`body { visibility: hidden; }`);

    onDOMReady(main);

    function main() {
        currentPageType = utils.getPageType();
        context.pageType = currentPageType;
        utils.debugLog("Current page type is " + currentPageType, null, true);

        configManager = new ConfigManager();
        context.configManager = configManager;
        configManager.loadConfig();

        themeManager = new ThemeManager();
        blacklistManager = new BlacklistManager();

        infiniteScrolling = new InfiniteScrolling();

        configManager.addUpdateListener("advancedBlacklist.enable", applyTweakAdvancedBlacklist);
        configManager.addUpdateListener("advancedBlacklist.hideBlack", applyCssVariableBlacklist);
        configManager.addUpdateListener("advancedBlacklist.hideBlur", applyCssVariableBlacklist);
        configManager.addUpdateListener("advancedBlacklist.showOnHover", applyCssVariableBlacklist);

        configManager.addUpdateListener("collapsibleSidebar.enable", applyTweakCollapseSidebar);
        configManager.addUpdateListener("collapsibleSidebar.width", applyCssVariableGoCollapseSidebar);
        configManager.addUpdateListener("collapsibleSidebar.color", applyCssVariableGoCollapseSidebar);
        configManager.addUpdateListener("collapsibleSidebar.opacity", applyCssVariableGoCollapseSidebar);

        configManager.addUpdateListener("post.center", applyTweakPostCenter);
        configManager.addUpdateListener("post.fitTweaks", applyTweakPostFit);
        configManager.addUpdateListener("post.fitHorizontallyOnNarrow", applyTweakPostOnNarrow);
        configManager.addUpdateListener("post.switchFitOnClick", applyTweakPostClickSwitchFit);
        configManager.addUpdateListener("post.autoScroll", applyTweakPostAutoScroll);

        configManager.addUpdateListener("thumbs.resizeGallery", applyTweakResizeThumbsGallery);
        configManager.addUpdateListener("thumbs.resizeGallerySize", applyCssVariableGoThumbnailResize);
        configManager.addUpdateListener("thumbs.resizeMoreLikeThis", applyTweakResizeThumbsMoreLikeThis);
        configManager.addUpdateListener("thumbs.resizeMoreLikeThisSize", applyCssVariableGoThumbnailResize);
        configManager.addUpdateListener("thumbs.enlargeOnHover", applyTweakEnlargeOnHover);
        configManager.addUpdateListener("thumbs.scale", applyCssVariableGoThumbnailEnlarge);
        configManager.addUpdateListener("thumbs.highRes", applyTweakLoadHighRes);
        configManager.addUpdateListener("thumbs.loader", applyTweakLoadingIndicator);
        configManager.addUpdateListener("thumbs.removeTitle", applyTweakRemoveTitle);
        configManager.addUpdateListener("thumbs.preventOffScreen", applyTweakPreventOffScreen);
        configManager.addUpdateListener("thumbs.roundCorners", applyTweakRoundCorners);

        configManager.addUpdateListener("fastDL.thumbs", applyTweakFastDL);
        configManager.addUpdateListener("fastDL.post", applyTweakFastDLPost);

        configManager.addUpdateListener("infiniteScroll.enable", applyTweakInfiniteScroll);
        configManager.addUpdateListener("infiniteScroll.paginatorOnTop", applyTweakPaginatorOnTop);
        configManager.addUpdateListener("infiniteScroll.goToTop", applyTweakGoToTop);

        infiniteScrolling.addUpdateListener(e => {
            applyTweakEnlargeOnHover(Boolean(configManager.findValueByKey("thumbs.enlargeOnHover")), e);
            applyTweakLoadingIndicator(Boolean(configManager.findValueByKey("thumbs.loader")), e);
            applyTweakRoundCorners(Boolean(configManager.findValueByKey("thumbs.roundCorners")), e);
            applyTweakRemoveTitle(Boolean(configManager.findValueByKey("thumbs.removeTitle")), e);
            applyTweakFastDL(Boolean(configManager.findValueByKey("fastDL.thumbs")), e);

            applyTweakResizeThumbsGallery(Boolean(configManager.findValueByKey("thumbs.resizeGallery")), e);
            if (configManager.findValueByKey("advancedBlacklist.enable"))
                blacklistManager.applyBlacklist(e);
        });

        configManager.applyConfig();

        utils.debugLog("Registering styles");
        GM_addStyle(GM_getResourceText("css"));

        utils.debugLog("Registering config window");
        registerConfigWindow();

        blackoutStyle.remove();
    }

    // lazy fix for the back button, don't want to deal with HTML5 stuff
    window.onpopstate = function (event) {
        if (event && event.state) {
            location.reload();
        }
    };

    // Apply CSS Variables
    /** @type {PreferenceUpdateCallback} */
    function applyCssVariableGoCollapseSidebar() {
        utils.debugLog("Applying css variable .go-collapse-sidebar");

        /** @type {HTMLStyleElement} */
        let style = document.querySelector("#goCollapseSidebarVariables");

        if (!style) {
            style = document.createElement("style");
            style.id = "goCollapseSidebarVariables";
            document.body.appendChild(style);
        }

        style.innerHTML = `
        .go-collapse-sidebar {
            --collapsed-width: ${configManager.findValueByKey("collapsibleSidebar.width")};
            --collapsed-color: ${configManager.findValueByKey("collapsibleSidebar.color")};
            --expanded-opacity: ${configManager.findValueByKey("collapsibleSidebar.opacity")};
        }
        .go-collapse-sidebar-container-tweak {
            --collapsed-width: ${configManager.findValueByKey("collapsibleSidebar.width")};
        }
        `;
    }
    /** @type {PreferenceUpdateCallback} */
    function applyCssVariableGoThumbnailEnlarge() {
        utils.debugLog("Applying css variable .go-thumbnail-enlarge");

        /** @type {HTMLStyleElement} */
        let style = document.querySelector("#goThumbnailEnlargeVariables");

        if (!style) {
            style = document.createElement("style");
            style.id = "goThumbnailEnlargeVariables";
            document.body.appendChild(style);
        }

        style.innerHTML = `
        .go-thumbnail-enlarge {
            --enlarge-scale: ${configManager.findValueByKey("thumbs.scale")};
        }
        `;
    }
    /** @type {PreferenceUpdateCallback} */
    function applyCssVariableGoThumbnailResize() {
        utils.debugLog("Applying css variable .go-thumbnail-resize");

        /** @type {HTMLStyleElement} */
        let style = document.querySelector("#goThumbnailResizeVariables");

        if (!style) {
            style = document.createElement("style");
            style.id = "goThumbnailResizeVariables";
            document.body.appendChild(style);
        }

        style.innerHTML = `
        .go-thumbnail-resize {
            --thumb-gallery-size: ${configManager.findValueByKey("thumbs.resizeGallerySize")};
            --thumb-morelikethis-size: ${configManager.findValueByKey("thumbs.resizeMoreLikeThisSize")};
        }
        `;
    }
    /** @type {PreferenceUpdateCallback} */
    function applyCssVariableBlacklist() {
        utils.debugLog("Applying css variable .go-blacklisted");

        /** @type {HTMLStyleElement} */
        let style = document.querySelector("#goBlacklistVariables");

        if (!style) {
            style = document.createElement("style");
            style.id = "goBlacklistVariables";
            document.body.appendChild(style);
        }

        let black = configManager.findValueByKey("advancedBlacklist.hideBlack") ? "0%" : "100%";
        let blur = configManager.findValueByKey("advancedBlacklist.hideBlur");
        let show = configManager.findValueByKey("advancedBlacklist.showOnHover");

        style.innerHTML = `
        .go-blacklisted {
            --blacklist-black: ${black};
            --blacklist-blur: ${blur};

            --blacklist-hoverBlack: ${show ? "100%" : black};
            --blacklist-hoverBlur: ${show ? "0" : blur};
        }
        `;
    }

    // Apply Tweak
    //      Collapsible sidebar
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakCollapseSidebar(value) {
        if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(currentPageType)) return;

        utils.debugLog(`Applying TweakCollapseSidebar state: ${String(value)}`);

        document.querySelector("#container > section").classList.toggle("go-collapse-sidebar", value);
        document.querySelector("#tag-list").classList.toggle("go-tag-list-top-bottom-padding", value);

        document.querySelectorAll("#tag-list > li[class^='tag-type']").forEach((i) => { i.classList.toggle("go-collapse-sidebar-tags-list-tweak", value); });
        document.querySelector("#container").classList.toggle("go-collapse-sidebar-container-tweak", value);
        Object.values(document.getElementsByClassName("mobile-spacing")).forEach((i) => { i.classList.toggle("go-mobile-unspacing", value); });
        Object.values(document.getElementsByClassName("sm-hidden")).forEach((i) => { i.classList.toggle("go-sm-unhidden", value); });

    }
    //      Post
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostFit(value) {
        if (currentPageType != utils.pageTypes.POST) return;
        utils.debugLog(`Applying PostFit state: ${String(value)}`);

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

    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostCenter(value) {
        if (currentPageType != utils.pageTypes.POST) return;
        utils.debugLog(`Applying PostCenter state: ${String(value)}`);

        document.querySelectorAll(".note-container, #image, #gelcomVideoPlayer").forEach(i => {
            i.classList.toggle("go-center", value);
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostAutoScroll(value) {
        if (currentPageType != utils.pageTypes.POST) return;
        utils.debugLog(`Applying PostAutoScroll state: ${String(value)}`);

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
        if (currentPageType != utils.pageTypes.POST) return;
        utils.debugLog(`Applying PostOnNarrow state: ${String(value)}`);

        document.querySelectorAll(".note-container, #image, #gelcomVideoPlayer").forEach(i => {
            i.classList.toggle("go-fit-width-on-narrow", value);
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value 
     */
    function applyTweakPostClickSwitchFit(value) {
        if (currentPageType != utils.pageTypes.POST) return;
        utils.debugLog(`Applying PostClickSwitchFit state: ${String(value)}`);

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
    }
    //      Thumbs
    /**
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    * @param {HTMLImageElement[]} thumbs
    */
    function applyTweakEnlargeOnHover(value, thumbs = null) {
        if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(currentPageType)) return;

        utils.debugLog(`Applying EnlargeOnHover state: ${String(value)}`);

        if (!thumbs) thumbs = utils.getThumbnails();
        thumbs.forEach((i) => {
            i.parentElement.classList.toggle("go-thumbnail-enlarge", value);

            if (currentPageType == utils.pageTypes.POST)
                i.style.margin = '';
            i.parentElement.style.margin = '10px'; //TODO: css
        });


        // Dependent tweak
        applyTweakLoadHighRes(Boolean(configManager.findValueByKey("thumbs.highRes")));
        applyTweakPreventOffScreen(Boolean(configManager.findValueByKey("thumbs.preventOffScreen")));
    }
    /** 
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakLoadHighRes(value) {
        if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(currentPageType)) return;

        // Dependencies check
        let dependValue = configManager.findValueByKey("thumbs.enlargeOnHover") && value;

        utils.debugLog(`Applying LoadHighRes state: ${String(dependValue)}`);

        utils.getThumbnails().forEach((i) => {
            if (dependValue) {
                i.setAttribute("data-thumb-src", i.src);
                i.addEventListener("mouseenter", setImageHighResSource);
                i.addEventListener("mouseleave", setImageLowResSource);
            } else {
                i.removeEventListener("mouseenter", setImageHighResSource);
                i.removeEventListener("mouseleave", setImageLowResSource);
            }
        });

        // Dependent tweak
        applyTweakLoadingIndicator(Boolean(configManager.findValueByKey("thumbs.loader")));
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    * @param {HTMLImageElement[]} thumbs
    */
    function applyTweakLoadingIndicator(value, thumbs = null) {
        if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(currentPageType)) return;

        // Dependencies chec
        let dependValue = configManager.findValueByKey("thumbs.enlargeOnHover") && configManager.findValueByKey("thumbs.highRes") && value;

        utils.debugLog(`Applying LoadingIndicator state: ${String(dependValue)}`);

        if (!thumbs) thumbs = utils.getThumbnails();
        thumbs.forEach((i) => {
            if (dependValue) {
                i.addEventListener("mouseenter", addLoadingIndicator);
            } else {
                i.removeEventListener("mouseenter", addLoadingIndicator);
            }
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakPreventOffScreen(value) {
        if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(currentPageType)) return;

        // Dependencies check
        let dependValue = configManager.findValueByKey("thumbs.enlargeOnHover") && value;

        utils.debugLog(`Applying PreventOffScreen state: ${String(dependValue)}`);

        utils.getThumbnails().forEach((i) => {
            if (dependValue) {
                i.parentElement.addEventListener("mouseenter", updateTransformOrigin);
            } else {
                i.parentElement.removeEventListener("mouseenter", updateTransformOrigin);
                i.parentElement.style.transformOrigin = "";
            }
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    * @param {HTMLImageElement[]} thumbs
    */
    function applyTweakRoundCorners(value, thumbs = null) {
        if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(currentPageType)) return;

        utils.debugLog(`Applying RoundCorners state: ${String(value)}`);

        if (!thumbs) thumbs = utils.getThumbnails();
        thumbs.forEach((i) => {
            i.classList.toggle("go-thumbnail-corners", value);
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    * @param {HTMLImageElement[]} thumbs
    */
    function applyTweakRemoveTitle(value, thumbs = null) {
        if (utils.pageTypes.GALLERY != currentPageType) return;

        utils.debugLog(`Applying RemoveTitle state: ${String(value)}`);

        if (!thumbs) thumbs = utils.getThumbnails();
        thumbs.forEach((i) => {
            if (value) {
                i.setAttribute("data-title", i.getAttribute("title"));
                i.removeAttribute("title");
            } else {
                i.setAttribute("title", i.getAttribute("data-title"));
                i.removeAttribute("data-title");
            }
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    * @param {HTMLImageElement[]} thumbs
    */
    function applyTweakResizeThumbsGallery(value, thumbs = null) {
        if (utils.pageTypes.GALLERY != currentPageType) return;

        utils.debugLog(`Applying ResizeThumbGallery state: ${String(value)}`);

        if (!thumbs) thumbs = utils.getThumbnails();
        thumbs.forEach((i) => {
            i.classList.toggle("go-thumbnail-resize", value);
            i.parentElement.parentElement.classList.toggle("go-thumbnail-resize", value); // img < a < (article) < div.thumbnail-container
        });
    }
    /** 
    * @type {PreferenceUpdateCallback}
    * @param {boolean} value
    */
    function applyTweakResizeThumbsMoreLikeThis(value) {
        if (utils.pageTypes.POST != currentPageType) return;

        utils.debugLog(`Applying ResizeThumbMoreLikeThis state: ${String(value)}`);

        utils.getThumbnails().forEach((i) => {
            i.classList.toggle("go-thumbnail-resize", value);
        });
    }
    //      FastDL
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     * @param {HTMLImageElement[]} thumbs
     */
    function applyTweakFastDL(value, thumbs = null) {
        if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(currentPageType)) return;

        utils.debugLog(`Applying FastDL state: ${String(value)}`);

        if (!thumbs) thumbs = utils.getThumbnails();
        thumbs.forEach((i) => {
            if (value) {
                i.addEventListener("contextmenu", downloadThumbWithRMB);
            } else {
                i.removeEventListener("contextmenu", downloadThumbWithRMB);
            }
        });
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakFastDLPost(value) {
        if (currentPageType != utils.pageTypes.POST) return;

        utils.debugLog(`Applying FastDLPost state: ${String(value)}`);

        let post = document.querySelector("#gelcomVideoPlayer, #image");
        if (value) {
            post.addEventListener("contextmenu", downloadPostWithRMB);
        } else {
            post.removeEventListener("contextmenu", downloadPostWithRMB);
        }
    }
    //      Infinite Scroll
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakInfiniteScroll(value) {
        if (currentPageType != utils.pageTypes.GALLERY) return;

        utils.debugLog(`Applying InfiniteScroll state: ${String(value)}`);

        infiniteScrolling.setup(value);
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakPaginatorOnTop(value) {
        if (currentPageType != utils.pageTypes.GALLERY) return;

        utils.debugLog(`Applying InfiniteScroll state: ${String(value)}`);

        if (value) {
            if (document.querySelector(".top-pagination")) return;

            /** @type {HTMLElement} */
            let topPagination = document.querySelector(".pagination").cloneNode(true);
            topPagination.classList.add("top-pagination");
            document.querySelector("main").insertBefore(topPagination, document.querySelector(".thumbnail-container"));
        } else {
            document.querySelector(".top-pagination").remove();
        }
    }
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakGoToTop(value) {
        if (currentPageType != utils.pageTypes.GALLERY) return;

        utils.debugLog(`Applying InfiniteScroll state: ${String(value)}`);

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
    }
    //      Advanced Blacklist
    /**
     * @type {PreferenceUpdateCallback}
     * @param {boolean} value
     */
    function applyTweakAdvancedBlacklist(value) {
        if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(currentPageType)) return;
        utils.debugLog(`Applying AdvancedBlacklist state: ${String(value)}`);

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

        let topnav = document.querySelector("#myTopnav");
        topnav.insertBefore(settingsButton, topnav.querySelectorAll("a")[1]);

        document.querySelector("#container").appendChild(sDiv);

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
                    inputBool.id = utils.findPath(configManager.config, pref[0], pref[1]).substring(1).replace(".items", "");
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
                    inputText.id = utils.findPath(configManager.config, pref[0], pref[1]).substring(1).replace(".items", "");
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
                        i.checked = Boolean(configManager.findValueByKey(i.id));
                        break;

                    case "text":
                        i.value = String(configManager.findValueByKey(i.id));
                        break;
                }
            });
        }
    }
    /**
     * Updating and applying preference item value
     * @param {Object} e 
     * @param {HTMLInputElement} e.target
     * @param {PreferenceItem} pref
     */
    function updatePreferenceItem(e, pref) {
        let value = e.target.type == "checkbox" ? e.target.checked : e.target.value;
        utils.debugLog("Updating prefItem with value", { pref, value });

        pref.value = value;
        configManager.onUpdate(e.target.id, value);
    }


    //      Tweak
    /**
     * @param {MouseEvent} e
     */
    function setImageHighResSource(e) {
        /** @type {HTMLImageElement} */
        let img = e.target;
        utils.loadPostItem(Number(/id=([0-9]+)/.exec(img.parentElement.getAttribute("href"))[1]))
            .then((post) => img.src = post.highResThumb)
            .catch((error) => utils.debugLog("Failed to load highres image for following element with following error:", { img, error }));

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
            utils.debugLog(`Height is ${window.innerHeight} vs ${image.height}`);
            utils.debugLog(`Width  is ${window.innerWidth} vs ${image.width}`);

            if (window.innerHeight > image.height && window.innerWidth > image.width) {
                utils.debugLog("Scrolling");
                image.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
                history.scrollRestoration = 'manual';
            } else {
                history.scrollRestoration = 'auto';
            }
        }
        // not works for video
    }
    function toggleFitMode() {
        utils.debugLog("Toggling fit mode");

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

        if (xOrigin - (rect.width * Number(configManager.findValueByKey("thumbs.scale")) / 2) <= window.innerWidth * 0.01) {
            elem.style.transformOrigin = 'left';
        } else if (xOrigin + (rect.width * Number(configManager.findValueByKey("thumbs.scale")) / 2) >= window.innerWidth * 0.99) {
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
        utils.downloadPostById(postId);
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
        utils.downloadPostById(postId);
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

})();
