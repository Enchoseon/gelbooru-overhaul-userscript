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
// @require     https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// ==/UserScript==

(function() {
    "use strict";
    class ConfigManager {
        currentConfigVersion = 1;
        config;
        loadConfig = function(){
            let cfg = GM_getValue("config", undefined);

            if(cfg == undefined){
                this.config = this.getDefaultConfig();
            }
            else if(this.currConfigVersion > cfg.configVersion) {
                cfg = this.migrateConfig(cfg);
                this.config = cfg;
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
            this.saveConfig(migratingConfig)
            return migratingConfig;
        }
    }
    
    const PageTypes = Object.freeze({GALLERY: "gallery", POST: "post", WIKI_VIEW: "wiki_view", POOL_VIEW: "pool_view", UNDEFINED: "undefined"});
    
    let configManager = new ConfigManager();
    configManager.loadConfig();
    debugLog(configManager.config);
    
    // Any page tweaks
    debugLog("Current page type is " + detectPageType());
    
    // Page specific tweaks
    switch (detectPageType()){
        case PageTypes.GALLERY:
        
        break;
        case PageTypes.POST:
        
        break;
        case PageTypes.WIKI_VIEW:
        
        break;
        case PageTypes.POOL_VIEW:
        
        break;
        case PageTypes.UNDEFINED:
        
        break;
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
    
    function debugLog(value){
        // Notice no debug until configManager loades and migrates config
        // Probably im should add force debug while migrating config...
        if(configManager.config.debug == true) {
            if(typeof(value) == "string")
                console.log("[GELO]: " + value);
            else {
                console.log(value);
            }
        }
    }
})();
