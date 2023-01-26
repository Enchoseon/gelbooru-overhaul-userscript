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