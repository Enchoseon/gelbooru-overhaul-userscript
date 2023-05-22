/**
 * @class Class that manages light/dark theme switching
 */
class ThemeManager {
    isMatchMediaSupported = (window.matchMedia && window.matchMedia('(prefers-color-scheme)').media !== 'not all');
    constructor() {
        this.replaceCss();
        this.checkForThemeSwitch();

        if (this.isMatchMediaSupported)
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", e => this.checkForThemeSwitch());

        this.scheduleCheckForThemeSwitch();

        if (context.pageType != utils.pageTypes.UNDEFINED) {
            let darkModeButton = document.querySelector('#myTopnav a[onclick*="darkModeToggle(); return false;"], #navbar a[onclick*="darkModeToggle(); return false;"]');
            darkModeButton.onclick = undefined;
            darkModeButton.setAttribute("title", "Click to force switch dark mode for current session\nRight click to clear force mode");
            darkModeButton.addEventListener("click", e => this.switchForceSessionMode());
            darkModeButton.addEventListener("contextmenu", e => this.clearForceSessionMode());
        }
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
     * Replaces stock site css with a modifyable one
     * @private
     */
    replaceCss() {
        var stylesheets = document.head.querySelectorAll("link[href^='gridStyle']");

        if (stylesheets == undefined || stylesheets.length == 0) return;
        stylesheets.forEach(e => e.remove());

        GM_addStyle(GM_getResourceText("css-common"));
    }
    /**
     * Checks if darkmode needs to be switched
     */
    checkForThemeSwitch(isAmoled = undefined) {
        if (isAmoled == undefined) isAmoled = context.configManager.findValueByKey("darkMode.amoled");
        this.isDarkModeRequired 
            ? (isAmoled ? this.applyAmoledDarkMode() : this.applyDefaultDarkMode()) 
            : this.applyDefaultLightMode();
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
     * @returns {boolean} Required Dark Mode state
     */
    get isDarkModeRequired() {
        let forceSession = this.forceSessionMode;
        if (this.forceSessionMode != undefined) return forceSession;

        if (context.configManager.findValueByKey("darkMode.force")) {
            return true;
        } else if (context.configManager.findValueByKey("darkMode.auto")) {
            if (context.configManager.findValueByKey("darkMode.forceTime") || !this.isMatchMediaSupported) {
                let hours = new Date().getHours();
                return hours >= context.configManager.findValueByKey("darkMode.timeStart") || hours <= context.configManager.findValueByKey("darkMode.timeEnd");
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

        /** @type {HTMLStyleElement} */
        let style = document.querySelector("#goThemeVariables");

        if (!style) {
            style = document.createElement("style");
            style.id = "goThemeVariables";
            document.body.appendChild(style);
        }

        style.innerHTML = `
                    :root {
                        --background-color: #fff;
                        --foreground-color: #000;

                        --a-foreground-color: #337ab7;

                        --alert-info-background-color: #d9edf7;
                        --alert-info-border: 2px solid #bce8f1;
                        --alert-info-foreground-color: #31708f;

                        --alert-success-background: #dff0d8;

                        --notice-not-error-background-color: #FFFBBF;
                        --notice-not-error-border: 1px solid #CCC999;

	                    --thread-title-background-color: #006ffa;

                        --topnav-a-active-foreground-color: #006ffa;

                        --inbox-self-background-color: #0000000d;

                        --thread-container-item-border: 1px solid #f0f0f0;

                        --comment-body-foreground-color: #444;
                        --comment-box-background: #fff;
                        --comment-box-border: 1px solid #f0f0f0;
                        --comment-user-thumbnail: #fcfcfc;
                        
                        --quote-foreground: #444444;
                        --quote-backgroung: #fefefe url('./layout/quote.png') no-repeat top right;
                        --quot-border: 1px solid #f0f0f0;

                        --td-border: 1px solid #f0f0f0;
                        --th-background: #006ffa;

                        --table-tr-pending-tag-background: #dcecf6;
                        --table-tr-rejected-tag-background: #f6dcdc;

                        --textarea-border: 1px solid #e0e0e0;

                        --navsubmenu-background: #444444;

                        --searcharea-background: #fff;

                        --header-background: linear-gradient(#328dfe, #0773fb);

                        --aside-border2: 1px solid #f0f0f0;

                        --paginator-foreground: #337ab7;
                        --paginator-border: 1px solid #EAEAEA;
                        --paginator-a-hover-background: #006ffa;

                        --footer-backround: linear-gradient(#328dfe, #0773fb);
                    }
        `;

        utils.clearCookie("dark_mode");
    }
    /**
     * applies default gelbooru dark mode
     */
    applyDefaultDarkMode() {
        utils.debugLog("Applying default dark mode");

        /** @type {HTMLStyleElement} */
        let style = document.querySelector("#goThemeVariables");

        if (!style) {
            style = document.createElement("style");
            style.id = "goThemeVariables";
            document.body.appendChild(style);
        }

        style.innerHTML = `
                    :root {
                        --background-color: #1f1f1f;
                        --foreground-color: #999;

                        --a-foreground-color: #fff;

                        --input-background-color: #333;
                        --input-foreground-color: #eee;
                        --input-border: 1px solid #555;

                        --alert-info-background-color: #555;
                        --alert-info-border: 1px solid #333;
                        --alert-info-foreground-color: #fff;

                        --alert-success-background: #242;

                        --alert-success-a-foreground-color: #fff;
                        --alert-info-a-foreground-color: #fff;

                        --notice-not-error-background-color: #111;
                        --notice-not-error-border: 1px solid #333;
                        --notice-not-error-foreground-color: #fff;

	                    --thread-title-background-color: #303030;

                        --topnav-a-active-foreground-color: #000;

                        --inbox-self-background-color: #ffffff1a;

                        --thread-container-item-border: 1px solid #333;

                        --comment-body-foreground-color: #eee;
                        --comment-box-background: #111;
                        --comment-box-border: 1px solid #222;
                        --comment-user-thumbnail: #333;

                        --quote-foreground: #fff;
                        --quote-backgroung: #333 url('./layout/quote.png') no-repeat top right;
                        --quot-border: 1px solid #444;

                        --note-body-foreground: #000;

                        --td-border: 1px solid #333;
                        --th-background: #303030;

                        --select-foreground: #fff;
                        --select-background: #000;

                        --table-tr-pending-tag-background: #000;
                        --table-tr-rejected-tag-background: #000;

                        --textarea-border: 1px solid #666;
                        --textarea-background: #303030;
                        --textarea-foreground: #fff;

                        --navsubmenu-background: #252525;

                        --ui-widget-content-border: 1px solid #666;
                        --ui-widget-content-background: #1f1f1f;
                        --ui-widget-content-foreground: #444;

                        --searcharea-background: #151515;
                        --searchlist-background: #333;

                        --invert-filter: invert(100%);

                        --header-background: linear-gradient(#444, #333);

                        --active-foreground: #000;

                        --aside-border: 1px solid #333;
                        --aside-border2: 1px solid #333;

                        --paginator-foreground: #fff;
                        --paginator-border: 1px solid #555;

                        --paginator-a-hover-background: #555;
                        --paginator-b: #c4c4c4;

                        --footer-backround: #333;
                        --footer-foreground: #fff;
                    }
        `;

        utils.setCookie("dark_mode", "1");
    }
    /**
     * applies amoled dark mode
     */
    applyAmoledDarkMode() {
        utils.debugLog("Applying amoled dark mode");

        /** @type {HTMLStyleElement} */
        let style = document.querySelector("#goThemeVariables");

        if (!style) {
            style = document.createElement("style");
            style.id = "goThemeVariables";
            document.body.appendChild(style);
        }

        style.innerHTML = `
                    :root {
                        --background-color: #000;
                        --foreground-color: #999;

                        --a-foreground-color: #fff;

                        --input-background-color: #333;
                        --input-foreground-color: #eee;
                        --input-border: 1px solid #555;

                        --alert-info-border: 1px solid #333;
                        --alert-info-foreground-color: #fff;

                        --alert-success-a-foreground-color: #90cf80;
                        --alert-info-a-foreground-color: #fff;

                        --notice-not-error-background-color: #111;
                        --notice-not-error-border: 1px solid #333;
                        --notice-not-error-foreground-color: #fff;

	                    --thread-title-background-color: #303030;

                        --topnav-a-active-foreground-color: #000;

                        --inbox-self-background-color: #ffffff1a;

                        --thread-container-item-border: 1px solid #333;

                        --comment-body-foreground-color: #eee;
                        --comment-box-background: #111;
                        --comment-box-border: 1px solid #222;
                        --comment-user-thumbnail: #333;

                        --quote-foreground: #fff;
                        --quote-backgroung: #333 url('./layout/quote.png') no-repeat top right;
                        --quot-border: 1px solid #444;

                        --note-body-foreground: #000;

                        --td-border: 1px solid #333;
                        --th-background: #303030;

                        --select-foreground: #fff;
                        --select-background: #000;

                        --table-tr-pending-tag-background: #000;
                        --table-tr-rejected-tag-background: #000;

                        --textarea-border: 1px solid #666;
                        --textarea-background: #303030;
                        --textarea-foreground: #fff;

                        --navsubmenu-background: #000;

                        --ui-widget-content-border: 1px solid #666;
                        --ui-widget-content-background: #1f1f1f;
                        --ui-widget-content-foreground: #444;

                        --searcharea-background: #151515;
                        --searchlist-background: #333;

                        --invert-filter: invert(100%);

                        --header-background: #000;

                        --active-foreground: #000;

                        --aside-border: 1px solid #333;
                        --aside-border2: 1px solid #333;

                        --paginator-foreground: #fff;
                        --paginator-border: 1px solid #555;

                        --paginator-a-hover-background: #555;
                        --paginator-b: #c4c4c4;

                        --footer-backround: #000;
                        --footer-foreground: #fff;
                    }
        `;

        utils.setCookie("dark_mode", "1");        
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