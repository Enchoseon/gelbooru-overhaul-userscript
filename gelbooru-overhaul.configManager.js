/** 
 * @class Class that manages (saves, loads, migrates) and provides the config data
 */
class ConfigManager {
    /** 
     * @typedef  PreferenceItem
     * @type     {Object}
     * @property {number | string | boolean} value          Value of preference
     * @property {string}                    name           Displayed name in config window
     * @property {string}                    description    Description displayed in config window
     * @property {boolean}                   [locked=false] Determines if preference should be available for editing
     * 
     * @typedef  PreferenceItemPacked
     * @type     {Object}
     * @property {number | string | boolean} value          Value of preference
     * 
     * @callback PreferenceUpdateCallback
     * @param    {number | string | boolean} value          New value
     * @returns  {void}
     * 
     * @typedef  PreferenceCategory 
     * @type     {Object}
     * @property {string}                          name     Displayed name in config window
     * @property {Object.<string, PreferenceItem>} items    Children preference items
     * 
     * @typedef {Object.<string, PreferenceCategory>} Preferences
     * 
     * 
     * 
     * @typedef PreferenceCategoryPacked
     * @type     {Object}
     * @property {string}                                name     Displayed name in config window
     * @property {Object.<string, PreferenceItemPacked>} items    Children preference items
     * 
     * @typedef {Object.<string, PreferenceCategoryPacked>} PreferencesPacked
     */
    /** 
     * Internal version of the config used
     * @private
     * @type {number}
     */
    get currentConfigVersion() { return 1; };
    /**
     * Stores all the config properties
     * @public
     * @type {Preferences}
     */
    config;
    /**
     * Stores all the dispatch handlers
     * @private
     * @type {Object<string, PreferenceUpdateCallback[]>}
     */
    dispatchHandlers = {};
    /**
     * @constructor
     */
    constructor() {
    }
    /**
     * Registers an event listener
     * @public
     * @param {string} prefKey 
     * @param {PreferenceUpdateCallback} handler 
     * @returns {number} Number of listeners for gven key
     */
    addUpdateListener(prefKey, handler) {
        if(!this.dispatchHandlers[prefKey]) this.dispatchHandlers[prefKey] = [];
        return this.dispatchHandlers[prefKey].push(handler);
    }
    /**
     * Call handlers for given key using given arg
     * @public
     * @param {string} prefKey 
     * @param {number | string | boolean} value 
     */
    onUpdate(prefKey, value) {
        let handlers = this.dispatchHandlers[prefKey];
        if(handlers) handlers.forEach(h => h(value));
    }
    /**
     * @param {string} prefKey 
     * @returns {PreferenceItem} Found preference item or undefined
     */
    findItemByKey(prefKey){
        if (!prefKey || prefKey.length < 1) return undefined;
        let args = prefKey.split(".");

        let cat = this.config[args[0]];
        if (!cat) return undefined;

        let item = cat.items[args[1]];
        if (!item) return undefined;

        return item;
    }
    /**
     * @param {string} prefKey
     * @returns {string | number | boolean} Found preference value or undefined
     */
    findValueByKey(prefKey){
        let item = this.findItemByKey(prefKey);
        if (!item) return undefined;
        
        return item.value;
    }
    /**
     * Load config from the userscrip manager storage.
     * 
     * If there is no saved config then load default.
     * 
     * If saved config is outdated then make migrations.
     * @method loadConfig
     */
    loadConfig() {
        let cfg = GM_getValue("config", undefined);

        let unpackPreferences = this.unpackPreferences(cfg);
        this.config = unpackPreferences.preferences;
        if (unpackPreferences.isShouldBeSaved) this.saveConfig();

        utils.debugLog("Loaded config", this.config);
    }
    /**
     * Saves current config to the userscript storage
     * @method saveConfig
     */
    saveConfig() {
        GM_setValue("config", this.packPreferences(this.config));
    }
    /**
     * Applies current config values
     * @method applyConfig
     */
    applyConfig() {
        Object.entries(this.config).forEach(ce => {
            Object.entries(ce[1].items).forEach(ie => {
                this.onUpdate(`${ce[0]}.${ie[0]}`, ie[1].value);
            });
        });
    }
    /**
     * Clears config storage with default config
     * @method setDefaultConfig
     */
    setDefaultConfig() {
        this.config = this.getDefaultConfig();
        GM_setValue("config", {});
        this.saveConfig();
    }
    /**
     * Get default config with current configVersion
     * @private
     * @method getDefaultConfig
     * @returns {Object.<string, PreferenceCategory>} Default config with current configVersion
     */
    getDefaultConfig() {
        return {
            general: {
                name: "General",
                items: {
                    configVersion: {
                        value: 1,
                        name: "Config Version",
                        description: "Debug info of current config version",
                        locked: true
                    },
                    debug: {
                        value: false,
                        name: "Debug",
                        description: "Enable debugging information in the console",
                    },
                    maxCache: {
                        value: 420,
                        name: "Max cahed post items",
                        description: "How many posts to keep in the cache to make fewer requests (does not apply to image cache)"
                    }
                }
            },
            darkMode: {
                name: "Dark Mode",
                items: {
                    auto: {
                        value: true,
                        name: "Auto Dark Mode",
                        description: "Enable automatic dark theme switching",
                    },
                    force: {
                        value: false,
                        name: "Force Dark Mode",
                        description: "Always apply a dark theme"
                    },
                    amoled: {
                        value: false,
                        name: "Amoled Dark",
                        description: "Make dark theme darker"
                    },
                    forceTime: {
                        value: false,
                        name: "Force Time Dark Mode",
                        description: "Force the use of a dark theme at a certain time, regardless of system preferences"
                    },
                    timeStart: {
                        value: 18,
                        name: "Dark Mode Time Start Hour",
                        description: "Set the start time of the dark theme if 'Force Time Dark Mode' is enabled or system preference cannot be detected"
                    },
                    timeEnd: {
                        value: 6,
                        name: "Dark Mode Time End Hour",
                        description: "Set the end time of the dark theme if 'Force Time Dark Mode' is enabled or system preference cannot be detected"
                    }
                }
            },
            advancedBlacklist: {
                name: "Advanced Blacklist",
                items: {
                    enable: {
                        name: "Enable",
                        description: "Enable advanced mulipreset danbooru-like blacklist",
                        value: true
                    },
                    hideBlack: {
                        name: "Blacklout hidden images",
                        description: "Makes blacklisted images pitch black",
                        value: false
                    },
                    hideBlur: {
                        name: "Blur hidden images",
                        description: "Makes blacklisted images blurry. Set 0 to disable",
                        value: "8px"
                    },
                    showOnHover: {
                        name: "Show hidden images on hover",
                        description: "Temporarily show blacklisted image when you hover over it",
                        value: true
                    }
                }
            },
            collapsibleSidebar: {
                name: "Collapsible Sidebar",
                items: {
                    enable: {
                        value: true,
                        name: "Enable",
                        description: "Hide the sidebar to the left on gallery and post pages"                    },
                    width: {
                        value: "5px",
                        name: "Collapsed width",
                        description: "Width of collapsed sidebar"                    },
                    color: {
                        value: "red",
                        name: "Collapsed color",
                        description: "Color of collapsed sidebar"                    },
                    opacity: {
                        value: "90%",
                        name: "Expanded opacity",
                        description: "Opacity of expanded sidebar"                    }
                }
            },
            post: {
                name: "Post page",
                items: {
                    center: {
                        value: true,
                        name: "Center Content",
                        description: "Center image or video"                    },
                    fitTweaks: {
                        value: true,
                        name: "Fit Tweaks",
                        description: "Fit image by height and by width on 'expand image' click"                    },
                    fitHorizontallyOnNarrow: {
                        value: true,
                        name: "Fit Horizontally on narrow",
                        description: "Fit image by width when tab is too narrow (<850px)"                    },
                    switchFitOnClick: {
                        value: true,
                        name: "Switch fit on click",
                        description: "Click on image to switch fit mode (zoom in/zoom out)"                    },
                    autoScroll: {
                        value: true,
                        name: "Auto scroll",
                        description: "Scroll to post content itself when it loads, can be annoying and agressive"                    }
                }
            },
            thumbs: {
                name: "Thumbnails",
                items: {
                    resizeGallery: {
                        value: true,
                        name: "Resize gallery thumbnails",
                        description: "Allows to set custom thumbnail size using value below."                    },
                    resizeGallerySize: {
                        value: "175px",
                        name: "Max size of gallery thumbnail",
                        description: "Keep in mind that images are 250x250px. There is no point in a greater number."                    },
                    resizeMoreLikeThis: {
                        value: true,
                        name: "Resize 'More Like This' thumbnails",
                        description: "Allows to set custom thumbnail size using value below."                    },
                    resizeMoreLikeThisSize: {
                        value: "175px",
                        name: "Max size of 'More Like This' thumbnail",
                        description: "Keep in mind that images are 250x250px. There is no point in a greater number."                    },
                    enlargeOnHover: {
                        value: true,
                        name: "Enlarge on hover",
                        description: "Hover over the thumbnail to enlarge in"                    },
                    scale: {
                        value: 3,
                        name: "Enlarge scale",
                        description: "The scale value is applied when zooming in"                    },
                    highRes: {
                        value: true,
                        name: "Display high res",
                        description: "Load high resolution image/video preview/animated gif when thumbnail is enlarged"                    },
                    loader: {
                        value: true,
                        name: "Display loading indicator",
                        description: "Show loading indicator until the high res version for the thumbnail being loaded"                    },
                    removeTitle: {
                        value: true,
                        name: "Remove title",
                        description: "Remove popup hint for thumbnails to get rid of flicker and make viewing less annoying"                    },
                    preventOffScreen: {
                        value: true,
                        name: "Prevent off screen enlarging",
                        description: "The images on the sides of the screen will not extend beyond"                    },
                    roundCorners: {
                        value: true,
                        name: "Round corners",
                        description: "Add tiny corner round to the thumbnails"                    }
                }
            },
            fastDL: {
                name: "Fast Download",
                items: {
                    thumbs: {
                        value: false,
                        name: "For thumbnails",
                        description: "RMB on thumbnail to download post (Shift + RMB to open context menu). Set 'Download Mode' to 'Browser API' in userscript manager advanced config to see downloading progress"                    },
                    post: {
                        value: false,
                        name: "For post",
                        description: "RMB on post image to download it (Shift + RMB to open context menu). Set 'Download Mode' to 'Browser API' in userscript manager advanced config to see downloading progress"                    },
                    saveAs: {
                        value: true,
                        name: "Use 'Save as'",
                        description: "Request a download location (May not work for everyone)"
                    },
                    pattern: {
                        value: "%postId% - %artist%",
                        name: "File name pattern",
                        description: "Simple name pattern for saved post. Available: %postId% %artist% %character% %copyright% %md5% (videos does not have md5)"
                    },
                    separator: {
                        value: ", ",
                        name: "File name pattern list separator",
                        description: "Which sequence of characters separates multiple tag values"
                    },
                    saveTags: {
                        value: true,
                        name: "Also save tags",
                        description: "Saves additional text file with all tags with same name"
                    }
                }
            },
            infiniteScroll: {
                name: "Infinite Scroll",
                items: {
                    enable: {
                        value: true,
                        name: "Enable",
                        description: "Enable infinite scroll for gallery page. Refresh to clean page. History works wierd"                    },
                    threshold: {
                        value: 500,
                        name: "Infinite Scroll Threshold",
                        description: "How early to start loading the next page in pixels from the bottom of the page. Depends on your internet and scroll speed"
                    },
                    paginatorOnTop: {
                        value: true,
                        name: "Copy paginator on top of gallery",
                        description: "Place a copy of paginator on top of gallery to make navigation easier (or just possible with Infinite Scroll)"                    },
                    goToTop: {
                        value: true,
                        name: "Go to top button",
                        description: "Display floating 'Go to top' button"                    }
                }
            }
        };
    }
    /**
     * Pack config object to store only keys and values
     * @private
     * @method
     * @param {Preferences} prefs
     * @returns {PreferencesPacked}
     */
    packPreferences(prefs) {
        const forbiddenKeys = ["name", "description", "update", "locked"];
        return JSON.parse(
            JSON.stringify(prefs, (key, value) => {
                if (forbiddenKeys.includes(key)) return undefined;
                else return value;
            })
        );
    }
    /**
     * Unpack config object and migrate if necessary
     * @private
     * @method
     * @param {PreferencesPacked} json
     * @returns {UnpackedPreferences}
     * 
     * @typedef {Object} UnpackedPreferences
     * @property {Preferences} preferences
     * @property {boolean} isShouldBeSaved
     */
    unpackPreferences(json) {
        if (json == undefined) {
            return { preferences: this.getDefaultConfig(), isShouldBeSaved: true };
        }
        else if (this.currentConfigVersion > json.general.items.configVersion.value) {
            // step by step migration
            /** @type {Preferences} */
            /*
            let migratedPrefs = MergeRecursive(this.getDefaultConfig(), json);
            
            if(migratedPrefs.general.items.configVersion.value == 0){
                // migrate to keep old config
                // migrate property values and NECESSARILY configVersion
                migratedPrefs.general.items.configVersion.value = 1;

                // transfer values (copy/to string/to number/change range/change units)
                // you only care about .value OR changed category/item key
                // names and descriptions do not need to be migrated
                migratedPrefs.PrefCat.items.NewPrefItem.value = migratedPrefs.PrefCat.items.OldPrefItem.value;
                // do not move the whole PrefItem or PrefCat, otherwise the config will be broken
                migratedPrefs.NewPrefCat.items.PrefItem.value = migratedPrefs.OldPrefCat.items.PrefItem.value; 
                // remove no longer needed properties
                delete migratedPrefs.PrefCat.items.OldPrefItem;
                delete migratedPrefs.OldPrefCat;
            }
            // next migrate step here...
            if(migratedPrefs.general.items.configVersion.value == 1){}

            return {preferences: migratedPrefs, isShouldBeSaved: true};
            */
            throw new Error("There is no migrations yet. Something went wrong on packed config loading");
        }
        else {
            return { preferences: utils.mergeRecursive(this.getDefaultConfig(), json), isShouldBeSaved: false };
        }
    }
}
