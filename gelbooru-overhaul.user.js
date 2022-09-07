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
        constructor(){
            this.loadConfig();
        }
        loadConfig = function(){
            let cfg = GM_getValue("config", undefined);

            if(cfg == undefined){
                this.config = this.getDefaultConfig();
                this.saveConfig();
            }
            else if(this.currConfigVersion > cfg.configVersion) {
                cfg = this.migrateConfig(cfg);
                this.config = cfg;
                this.saveConfig();
            }
            else {
                this.config = cfg;
            }
        }
        saveConfig = function(config){
            GM_setValue("config", config);
        }
        saveConfig = function(){
            GM_setValue("config", this.config);
        }
        getDefaultConfig = function(){
            return {
                configVersion: 1,
                debug: false,
                darkMode: {
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

    const PageTypes = Object.freeze({GALLERY: "gallery", POST: "post", WIKI_VIEW: "wiki_view", POOL_VIEW: "pool_view", UNDEFINED: "undefined"});

    let configManager = new ConfigManager();

    debugLog("Loaded config", configManager.config);

    // Any page tweaks
    debugLog("Current page type is " + detectPageType());

    debugLog("Registering styles");
    registerStyles();

    // Page specific tweaks
    switch (detectPageType()){
        case PageTypes.GALLERY:
            if(configManager.config.collapseSidebar.enabled) {
                applyTweakCollapseSidebar();
                applyFixCollapseSidebarGallery();
            }
            break;
        case PageTypes.POST:
            if(configManager.config.collapseSidebar.enabled) {
                applyTweakCollapseSidebar();
                applyFixCollapseSidebarPost();
            }
            break;
        case PageTypes.WIKI_VIEW:

            break;
        case PageTypes.POOL_VIEW:

            break;
        case PageTypes.UNDEFINED:

            break;
    }
    // Register styles
    function registerStyles(){
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


    }

    // Apply Tweak
    function applyTweakCollapseSidebar(){
        debugLog("Applying TweakCollapseSidebar");
        onDOMReady(()=>{
            document.querySelector("#container > section").classList.add("go-collapse-sidebar");
            document.querySelector("#tag-list").classList.add("go-tag-list-top-bottom-padding");
        });
    }
    function applyFixCollapseSidebarGallery(){
        debugLog("Applying FixCollapseSidebarGallery");
        onDOMReady(()=>{
            document.querySelectorAll("#tag-list > li").forEach((i) => {i.classList.add("go-collapse-sidebar-tags-list-tweak");});
            document.querySelector("#container").classList.add("go-collapse-sidebar-container-tweak");
            document.querySelectorAll("#tag-list > li > a.mobile-spacing").forEach((i)=>{i.classList.add("go-mobile-unspacing")});
            document.querySelectorAll(".aside > .sm-hidden").forEach((i)=>{i.classList.add("go-sm-unhidden")});
        });
    }
    function applyFixCollapseSidebarPost(){
        debugLog("Applying FixCollapseSidebarPost");
        onDOMReady(()=>{
            document.querySelectorAll("#tag-list > li[class*='tag-type']").forEach((i) => {i.classList.add("go-collapse-sidebar-tags-list-tweak");});
            document.querySelector("#container").classList.add("go-collapse-sidebar-container-tweak");
            document.querySelectorAll("#tag-list > .sm-hidden").forEach((i)=>{i.classList.add("go-sm-unhidden")});
            document.querySelectorAll("#tag-list > li > .sm-hidden").forEach((i)=>{i.classList.add("go-sm-unhidden")});
        });
    }

    // Functions
    function detectPageType(){
        let params = new URLSearchParams(document.URL.split('?')[1]);

        if(!params.has("page"))
            return PageTypes.UNDEFINED;

        if(params.get("page") == "post" && params.get("s") == "list")
            return PageTypes.GALLERY;

        if(params.get("page") == "post" && params.get("s") == "view")
            return PageTypes.POST;

        if(params.get("page") == "wiki" && params.get("s") == "view")
            return PageTypes.WIKI_VIEW;

        if(params.get("page") == "pool" && params.get("s") == "show")
            return PageTypes.POOL_VIEW;

        return PageTypes.UNDEFINED;
    }

    function onDOMReady(func){
        if (document.readyState == "loaded" || document.readyState == "interactive" || document.readyState == "complete") {
            func();
        } else {
            document.addEventListener("DOMContentLoaded", function(event) {
                func();
            });
        }
    }

    function debugLog(message, value){
        // Notice no debug until configManager loades and migrates config
        // Probably im should add force debug while migrating config...
        if(configManager.config.debug == true) {
            if(!value)
                console.log("[GELO]: " + message);
            else
                console.log("[GELO]: " + message, value);
        }
    }
})();
