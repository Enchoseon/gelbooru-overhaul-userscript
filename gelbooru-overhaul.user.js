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
            else if(this.currConfigVersion > cfg.configVersion){
                cfg = this.migrateConfig(cfg);
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
                darkMode: {
                    amoledDark: false,
                    autoDarkMode: true,
                    forceDarkMode: false,
                    timeDarkModeForce: false,
                    timeDarkModeStartHour: 18,
                    timeDarkModeEndHour: 6,
                }
            };
            // migrate to keep old config
            migratingConfig = _.merge(migrationObject, migratingConfig);
            // update properties and NECESSARILY configVersion
            migratingConfig.configVersion = 1;
            // remove no longer needed properties
            delete migratingConfig.darkMode.outdatedProp;
        }
        // next migrate step here...
        if(migratingConfig.configVersion == 1){}
        */

            // return updated config
            this.saveConfig(migratingConfig)
            return migratingConfig;
        }
    }
    
    
    
    let configManager = new ConfigManager();
    configManager.loadConfig();
    console.log(configManager.config);
    configManager.saveConfig();
})();
