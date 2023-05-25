/** 
 * @class Class that manages (saves, loads, migrates) and provides the config data
 */
class ConfigManager {
    /** 
     * @typedef  PreferenceItem
     * @type     {Object}
     * @property {number | string | boolean} value          Value of preference
     * @property {string[]}                  [values]       Values for select preference
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
        this.loadConfig();

        if (context.pageType != utils.pageTypes.UNDEFINED) {
            this.registerConfigWindow();
        }
    }
    /**
     * Registers an event listener
     * @public
     * @param {string} prefKey 
     * @param {PreferenceUpdateCallback} handler 
     * @returns {number} Number of listeners for gven key
     */
    addUpdateListener(prefKey, handler) {
        if (!this.dispatchHandlers[prefKey]) this.dispatchHandlers[prefKey] = [];
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
        if (handlers) handlers.forEach(h => h(value));
    }
    /**
     * @param {string} prefKey 
     * @returns {PreferenceItem} Found preference item or undefined
     */
    findItemByKey(prefKey) {
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
    findValueByKey(prefKey) {
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

        let unpacked = this.unpackPreferences(cfg);
        this.config = unpacked.preferences;
        if (unpacked.isShouldBeSaved) this.saveConfig();
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
                        description: "Current config version (internal value for debugging)",
                        locked: true
                    },
                    debug: {
                        value: false,
                        name: "Debug",
                        description: "Enable debugging output in the console",
                    },
                    maxCache: {
                        value: 420,
                        name: "Max Cached Post Items",
                        description: "How many posts to keep in the cache to reduce the number of requests (note: does not apply to the browser image cache)"
                    }
                }
            },
            darkMode: {
                name: "Dark Mode",
                items: {
                    auto: {
                        value: true,
                        name: "Auto Dark Mode",
                        description: "Enable dark mode based on the browser's preferred color scheme (light/dark)",
                    },
                    force: {
                        value: false,
                        name: "Force Dark Mode",
                        description: "Always apply a dark theme"
                    },
                    amoled: {
                        value: false,
                        name: "Amoled Dark",
                        description: "Make the dark theme even darker"
                    },
                    forceTime: {
                        value: false,
                        name: "Force Time Dark Mode",
                        description: "Force the use of a dark theme at a certain time, regardless of browser light/dark preferences"
                    },
                    timeStart: {
                        value: 18,
                        name: "Dark Mode Time Start Hour",
                        description: "The start time of the dark theme if 'Force Time Dark Mode' is enabled or browser preference cannot be detected"
                    },
                    timeEnd: {
                        value: 6,
                        name: "Dark Mode Time End Hour",
                        description: "The end time of the dark theme if 'Force Time Dark Mode' is enabled or browser preference cannot be detected"
                    }
                }
            },
            advancedBlacklist: {
                name: "Advanced Blacklist",
                items: {
                    enable: {
                        name: "Enable",
                        description: "Enable advanced multipreset Danbooru-like blacklist",
                        value: true
                    },
                    entriesOrder: {
                        name: "Entries Order by Hit Count",
                        description: "Order entries by hit count instead of original order",
                        value: false
                    },
                    hideMode: {
                        name: "Hiding Mode",
                        description: "Hiding mode for blacklisted images",
                        values: ["Apply Filter", "Collapse"],
                        value: "Apply Filter"
                    },
                    hideFilter: {
                        name: "Hiding Filter",
                        description: "Css filter for blacklisted images",
                        value: "blur(8px) brightness(80%)"
                    },
                    enlargeOnHover: {
                        name: "Enlarge Hidden Images on Hover",
                        description: "Allow enlarging blacklisted image if post enlarge is enabled",
                        value: false
                    },
                    showOnHover: {
                        name: "Show Hidden Images on Hover",
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
                        description: "Hide the sidebar to the left on gallery and post pages"
                    },
                    width: {
                        value: "5px",
                        name: "Collapsed Width",
                        description: "Width of collapsed sidebar"
                    },
                    color: {
                        value: "red",
                        name: "Collapsed Color",
                        description: "Color of collapsed sidebar"
                    },
                    opacity: {
                        value: "90%",
                        name: "Expanded Opacity",
                        description: "Opacity of expanded sidebar"
                    }
                }
            },
            post: {
                name: "Post Page",
                items: {
                    center: {
                        value: true,
                        name: "Center Content",
                        description: "Center image or video"
                    },
                    fitTweaks: {
                        value: true,
                        name: "Fit Tweaks",
                        description: "Fit image by height and by width on 'expand image' click"
                    },
                    fitHorizontallyOnNarrow: {
                        value: true,
                        name: "Fit Horizontally on Narrow",
                        description: "Fit image by width when tab is too narrow (<850px)"
                    },
                    switchFitOnClick: {
                        value: true,
                        name: "Switch Fit on Click",
                        description: "Click on image to switch fit mode (zoom in/zoom out)"
                    },
                    autoScroll: {
                        value: true,
                        name: "Auto Scroll",
                        description: "Scroll to post content itself when it loads, can be annoying and agressive"
                    }
                }
            },
            thumbs: {
                name: "Thumbnails",
                items: {
                    resizeGallery: {
                        value: true,
                        name: "Resize Gallery Thumbnails",
                        description: "Change the size of thumbnails in the gallery to the value below"
                    },
                    resizeGallerySize: {
                        value: "175px",
                        name: "Max Size of Gallery Thumbnail",
                        description: "Keep in mind that images are 250x250px, so larger values may look worse"
                    },
                    resizeMoreLikeThis: {
                        value: true,
                        name: "Resize 'More Like This' thumbnails",
                        description: "Change the size of thumbnails in the 'More Like This' section to the value below"
                    },
                    resizeMoreLikeThisSize: {
                        value: "175px",
                        name: "Max size of 'More Like This' thumbnail",
                        description: "Keep in mind that images are 250x250px, so larger values may look worse"
                    },
                    enlargeOnHover: {
                        value: true,
                        name: "Enlarge on Hover",
                        description: "Hover over the thumbnail to enlarge it"
                    },
                    scale: {
                        value: 3,
                        name: "Enlarge Scale",
                        description: "The scale value to apply when enlarging"
                    },
                    highRes: {
                        value: true,
                        name: "Display High Res",
                        description: "Load high resolution image, video preview, or animated gif when thumbnail is enlarged"
                    },
                    loader: {
                        value: true,
                        name: "Display Loading Indicator",
                        description: "Show loading indicator on the thumbnail while loading the higher resolution image"
                    },
                    removeTitle: {
                        value: true,
                        name: "Remove Title",
                        description: "Remove popup hint for thumbnails to get rid of flicker and make viewing less annoying"
                    },
                    preventOffScreen: {
                        value: true,
                        name: "Prevent Off Screen Enlarging",
                        description: "Prevent images on the sides of the screen extending beyond the edges of the screen"
                    },
                    roundCorners: {
                        value: true,
                        name: "Round Corners",
                        description: "Add round corners to the thumbnails"
                    }
                }
            },
            fastDL: {
                name: "Fast Download",
                items: {
                    thumbs: {
                        value: false,
                        name: "For Thumbnails",
                        description: "RMB on thumbnail to download post (Shift + RMB to open context menu). Set 'Download Mode' to 'Browser API' in userscript manager advanced config to see downloading progress"
                    },
                    post: {
                        value: false,
                        name: "For Post",
                        description: "RMB on image in individual post view to download it (Shift + RMB to open context menu). Set 'Download Mode' to 'Browser API' in userscript manager advanced config to see downloading progress"
                    },
                    saveAs: {
                        value: true,
                        name: "Use 'Save as'",
                        description: "Request a download location on every save (dependent on browser download settings)"
                    },
                    pattern: {
                        value: "%postId% - %artist%",
                        name: "File Name Pattern",
                        description: "Simple name pattern for saved post. Available: %postId% %artist% %character% %copyright% %md5% (note: videos do not have a %md5% hash)"
                    },
                    separator: {
                        value: ", ",
                        name: "File Name Pattern List Separator",
                        description: "Which sequence of characters separates multiple tag values"
                    },
                    saveTags: {
                        value: true,
                        name: "Also Save Tags",
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
                        description: "Enable infinite scroll for gallery page. Refresh to clean page. History works weird"
                    },
                    threshold: {
                        value: 500,
                        name: "Infinite Scroll Threshold",
                        description: "How early to start loading the next page in pixels from the bottom of the page. Depends on your internet and scroll speed"
                    },
                    paginatorOnTop: {
                        value: true,
                        name: "Copy Paginator on Top of Gallery",
                        description: "Place a copy of paginator on top of gallery to make navigation easier (or just possible with Infinite Scroll)"
                    },
                    goToTop: {
                        value: true,
                        name: "Go to Top Button",
                        description: "Display floating 'Go to top' button"
                    }
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
            return { preferences: utils.mergeRecursive(json, this.getDefaultConfig()), isShouldBeSaved: false };
        }
    }
    registerConfigWindow() {

        // config modal window
        let sDiv = buildSettingsWindow(this.config, this);

        // button to open window
        let settingsButton = buildSettingsButton(sDiv);

        let topnav = document.querySelector("#myTopnav");
        topnav.insertBefore(settingsButton, topnav.querySelectorAll("a")[1]);

        document.querySelector("#container").appendChild(sDiv);

        function buildSettingsButton(settingsElem) {
            let settingsButton = document.createElement("a");
            settingsButton.text = "Overhaul";
            settingsButton.style.cursor = "pointer";

            settingsButton.title = "Click to open Gelbooru Overhaul config\nRight click to force clear post item cache";

            settingsButton.addEventListener("click", (e) => {
                settingsElem.classList.remove("go-config-window-hidden");
                updateInputValues();
            });
            settingsButton.addEventListener("contextmenu", e => {
                if (e.shiftKey) return;

                e.preventDefault();
                GM_setValue("postCache", {});
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
         * @param {ConfigManager} confMan
         * @returns {HTMLDivElement} Config window div element
         */
        function buildSettingsWindow(prefs, confMan) {
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
                confMan.loadConfig();
                confMan.applyConfig();
                sDiv.classList.add("go-config-window-hidden");
            });

            let submitSave = document.createElement("input");
            submitSave.type = "submit";
            submitSave.className = "searchList";
            submitSave.value = "Save";
            submitSave.title = "Save changes and close window";
            submitSave.addEventListener("click", () => {
                sDiv.classList.add("go-config-window-hidden");
                confMan.saveConfig();
                confMan.applyConfig();
            });

            let submitRevert = document.createElement("input");
            submitRevert.type = "submit";
            submitRevert.className = "searchList";
            submitRevert.value = "Revert";
            submitRevert.title = "Cancel unsaved changes";
            submitRevert.addEventListener("click", () => {
                confMan.loadConfig();
                confMan.applyConfig();
                updateInputValues();
            });

            let submitDefaults = document.createElement("input");
            submitDefaults.type = "submit";
            submitDefaults.className = "searchList";
            submitDefaults.value = "Defaults";
            submitDefaults.title = "Reset config storage and load default config";
            submitDefaults.addEventListener("click", () => {
                confMan.setDefaultConfig();
                confMan.applyConfig();
                updateInputValues();
            });

            footer.appendChild(submitClose);
            footer.appendChild(submitSave);
            footer.appendChild(submitRevert);
            footer.appendChild(submitDefaults);

            sDiv.appendChild(header);
            sDiv.appendChild(buildSettingsTemplate(prefs, confMan));
            sDiv.appendChild(footer);

            return sDiv;
        }
        /**
         * Template for main config window content
         * @param {Preferences} prefs 
         * @param {ConfigManager} confMan
         * @returns {HTMLDListElement}
         */
        function buildSettingsTemplate(prefs, confMan) {
            let dl = document.createElement("dl");
            Object.values(prefs).map(i => buildPrefCatTemplate(i, confMan)).forEach(i => {
                dl.appendChild(i.dt);
                dl.appendChild(i.dd);
            });

            return dl;
        }
        /**
         * Template for PreferenceCategory
         * @param {PreferenceCategory} prefCat 
         * @param {ConfigManager} confMan
         * @returns {{dt: HTMLElement, dd: HTMLElement}}
         */
        function buildPrefCatTemplate(prefCat, confMan) {
            let dt = document.createElement("dt");
            let h3 = document.createElement("h3");
            h3.textContent = prefCat.name;
            dt.appendChild(h3);

            let dd = document.createElement("dd");
            let ul = document.createElement("ul");
            Object.entries(prefCat.items).map(i => buildPrefItemTemplate(i, confMan)).forEach(i => ul.appendChild(i));
            dd.appendChild(ul);

            return { dt: dt, dd: dd };
        }
        /**
         * Template for PreferenceItem
         * @param {[String, PreferenceItem]} pref
         * @param {ConfigManager} confMan
         * @returns {HTMLLIElement} 
         */
        function buildPrefItemTemplate(pref, confMan) {
            let type = typeof (pref[1].value);
            let li = document.createElement("li");

            switch (type) {
                case "boolean":
                    li.className = "checkbox-input";

                    let inputBool = document.createElement("input");
                    inputBool.type = "checkbox";
                    inputBool.id = utils.findPath(confMan.config, pref[0], pref[1]).substring(1).replace(".items", "");
                    inputBool.name = pref[1].name;
                    inputBool.checked = Boolean(pref[1].value);
                    inputBool.disabled = pref[1].locked;
                    inputBool.addEventListener("input", /** @param {InputEvent} e */ e => confMan.updatePreferenceItem(e, pref[1]));

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

                    let input;

                    if (pref[1].values) {
                        input = document.createElement("select");
                        input.id = utils.findPath(confMan.config, pref[0], pref[1]).substring(1).replace(".items", "");
                        input.name = pref[1].name;
                        input.disabled = pref[1].locked;

                        pref[1].values.forEach(i => {
                            let opt = document.createElement("option");
                            opt.value = i;
                            opt.textContent = i;
                            input.appendChild(opt);
                        });

                        input.value = String(pref[1].value);
                    } else {
                        input = document.createElement("input");
                        input.type = "text";
                        input.id = utils.findPath(confMan.config, pref[0], pref[1]).substring(1).replace(".items", "");
                        input.name = pref[1].name;
                        input.value = String(pref[1].value);
                        input.disabled = pref[1].locked;
                    }

                    let debouncedUpdate = utils.debounce(confMan.updatePreferenceItem, 300);
                    input.addEventListener("input", /** @param {InputEvent} e */ e => debouncedUpdate(e, pref[1]));

                    let pText = document.createElement("p");
                    pText.textContent = pref[1].description;

                    li.appendChild(labelText);
                    li.appendChild(input);
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
                        i.checked = Boolean(context.configManager.findValueByKey(i.id));
                        break;

                    case "select":
                    case "text":
                        i.value = String(context.configManager.findValueByKey(i.id));
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
    updatePreferenceItem(e, pref) {
        let value = e.target.type == "checkbox" ? e.target.checked : e.target.value;
        utils.debugLog("Updating prefItem with value", { pref, value });

        context.configManager.findItemByKey(e.target.id).value = value;
        context.configManager.onUpdate(e.target.id, value);
    }
}
