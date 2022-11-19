class context {
    static configManager;
    static pageType;
}
class utils {
    /** @var {Object.<string, string>} Enum with available page types */
    static pageTypes = Object.freeze({ GALLERY: "gallery", POST: "post", WIKI_VIEW: "wiki_view", POOL_VIEW: "pool_view", UNDEFINED: "undefined" });
    /**
     * Current page type (see {@link utils.pageTypes})
     * @returns {string}
     */
    static getPageType() {
        let params = new URLSearchParams(document.URL.split('?')[1]);

        if (!params.has("page"))
            return utils.pageTypes.UNDEFINED;

        if (params.get("page") == "post" && params.get("s") == "list")
            return utils.pageTypes.GALLERY;

        if (params.get("page") == "post" && params.get("s") == "view")
            return utils.pageTypes.POST;

        if (params.get("page") == "wiki" && params.get("s") == "view")
            return utils.pageTypes.WIKI_VIEW;

        if (params.get("page") == "pool" && params.get("s") == "show")
            return utils.pageTypes.POOL_VIEW;

        return utils.pageTypes.UNDEFINED;
    }
    /**
     * Styled console.log()
     * @param {string=}  message
     * @param {*=}       value 
     * @param {boolean}  [force]
     */
    static debugLog(message, value, force = false) {
        if (force || context.configManager.config.general.items.debug.value) {
            if (!value)
                console.log("[GELO]: " + message);
            else if (!message)
                console.log("[GELO]: Outputs value", value);
            else
                console.log("[GELO]: " + message, value);
        }
    }
    /**
     * Find path of diven property with given value in given object
     * @param {Object} obj 
     * @param {string} name 
     * @param {*} val 
     * @param {string} [currentPath] 
     * @returns {string}
     */
    static findPath(obj, name, val, currentPath) {
        currentPath = currentPath || '';

        let matchingPath;

        if (!obj || typeof obj !== 'object') return;

        if (obj[name] === val) return `${currentPath}.${name}`;

        for (const key of Object.keys(obj)) {
            if (key === name && obj[key] === val) {
                matchingPath = currentPath;
            } else {
                matchingPath = utils.findPath(obj[key], name, val, `${currentPath}.${key}`);
            }

            if (matchingPath) break;
        }

        return matchingPath;
    }
    /**
     * Recursive merge obj2 into obj1
     * @link https://stackoverflow.com/a/383245/19972602
     * @param {*} obj1 
     * @param {*} obj2 
     * @returns {*} obj2 merged into obj1
     */
    static mergeRecursive(obj1, obj2) {
        for (var p in obj2) {
            try {
                // Property in destination object set; update its value.
                if (obj2[p].constructor == Object) {
                    obj1[p] = utils.mergeRecursive(obj1[p], obj2[p]);
                } else {
                    obj1[p] = obj2[p];
                }
            } catch (e) {
                // Property in destination object not set; create it and set its value.
                obj1[p] = obj2[p];
            }
        }
        return obj1;
    }
    /**
     * Find property in object using string path
     * @param {string} path 
     * @param {Object} obj 
     * @param {string} separator 
     * @returns 
     */
    static resolve(path, obj = self, separator = '.') {
        var properties = Array.isArray(path) ? path : path.split(separator);
        return properties.reduce((prev, curr) => prev?.[curr], obj);
    }
    /**
     * Debounce decorator
     * @param {function} callee 
     * @param {number} timeout 
     * @returns {function}
     */
    static debounce(callee, timeout) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { callee.apply(this, args); }, timeout);
        };
    }
    static throttle(fn, threshhold, scope) {
        threshhold || (threshhold = 250);
        var last,
            deferTimer;
        return function () {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        };
    }
    /**
     * Throttle decorator
     * @param {function} fn 
     * @param {Number} threshold 
     * @param {*} scope 
     * @returns 
     */
    static debounceFirst(fn, threshold, scope) {
        threshold || (threshold = 250);
        var last,
            deferTimer;
        return function () {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                }, threshold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        };
    }
    /**
     * Set Cookie function
     * @link https://www.quirksmode.org/js/cookies.html
     * @param {String} name 
     * @param {String} value 
     * @param {Number} [days]
     */
    static setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }
    /**
     * Get Cookie function
     * @link https://www.quirksmode.org/js/cookies.html
     * @param {String} name 
     * @returns {String}
     */
    static getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    /**
     * Clear Cookie function
     * @link https://www.quirksmode.org/js/cookies.html
     * @param {String} name 
     */
    static clearCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    /**
     * Returns thumbnails from current page
     * @returns {NodeListOf<HTMLImageElement>}
     */
    static getThumbnails() {
        switch (context.pageType) {
            case utils.pageTypes.GALLERY:
                return document.querySelectorAll(".thumbnail-preview > a > img");
            case utils.pageTypes.POST:
                return document.querySelectorAll(".mainBodyPadding > div:last-of-type > a > img");
            default:
                return undefined;
        }
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
     * @property {string} rating - post rating
     * @property {number} score - post score
     * @property {string} md5 - md5 for file (0's for video)
     * @property {number} id - post id
     */
    static GM_setValueThrottle = utils.throttle((v) => GM_setValue("postCache", v), 100);
    /** @type {Object<number, PostItem>} */
    static localPostCache;
    /** @returns {Object<number, PostItem>} */
    static get postCache() {
        if (!this.localPostCache) this.localPostCache = GM_getValue("postCache", {});
        return this.localPostCache;
    }
    static set postCache(value) {
        utils.GM_setValueThrottle(value);
    }
    static postCacheSave() {
        utils.GM_setValueThrottle(utils.postCache);
    }
    /**
     * Cache and return post item
     * @param {number} postId 
     * @returns {Promise<PostItem>}
     */
    static async loadPostItem(postId) {
        return new Promise((resolve, reject) => {
            // just clear postCache if exceeded limit
            if (Object.keys(utils.postCache).length > context.configManager.findValueByKey("general.maxCache"))
                utils.postCache = {};

            if (!utils.postCache[postId]) {
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

                        if (!highResThumb || !fileLink) throw new Error("Failed to parse url");

                        let tags = {
                            artist: [...htmlDocument.querySelectorAll(".tag-type-artist       > a")].map(i => i.text),
                            character: [...htmlDocument.querySelectorAll(".tag-type-character > a")].map(i => i.text),
                            copyright: [...htmlDocument.querySelectorAll(".tag-type-copyright > a")].map(i => i.text),
                            metadata: [...htmlDocument.querySelectorAll(".tag-type-metadata   > a")].map(i => i.text),
                            general: [...htmlDocument.querySelectorAll(".tag-type-general     > a")].map(i => i.text),
                        };

                        let score = Object.values(htmlDocument.querySelectorAll("li")).find(i => i.textContent.startsWith("Score: ")).children[0].textContent;
                        let rating = Object.values(htmlDocument.querySelectorAll("li")).find(i => i.textContent.startsWith("Rating: ")).textContent.substring(8).toLowerCase();

                        try {
                            utils.postCache[postId] = {
                                highResThumb: highResThumb,
                                download: fileLink,
                                tags: tags,
                                md5: md5,
                                id: postId,
                                score: Number(score),
                                rating: rating
                            };
                        } catch (error) {
                            console.log(utils.postCache);
                        }
                        resolve(utils.postCache[postId]);
                        utils.postCacheSave();
                    })
                    .catch(error => reject(error));
            } else {
                resolve(utils.postCache[postId]);
            }
        });
    }
    /**
     * 
     * @param {PostItem} post 
     * @returns {Promise}
     */
    static downloadPostItem(post) {
        return new Promise((resolve, reject) => {
            //build filename
            let filename = String(context.configManager.findValueByKey("fastDL.pattern"));
            let spr = String(context.configManager.findValueByKey("fastDL.separator"));

            filename = filename.replace("%md5%", post.md5);
            filename = filename.replace("%postId%", String(post.id));
            filename = filename.replace("%artist%", post.tags.artist.length ? post.tags.artist.join(spr) : "unknown_artist");
            filename = filename.replace("%character%", post.tags.character.length ? post.tags.character.join(spr) : "unknown_character");
            filename = filename.replace("%copyright%", post.tags.copyright.length ? post.tags.copyright.join(spr) : "unknown_copyright");

            filename = filename.replace(/[<>:"/\|?*]/, "_"); // illegal chars

            GM_download({
                url: post.download,
                name: filename + "." + post.download.split(".").at(-1),
                saveAs: context.configManager.findValueByKey("fastDL.saveAs"),
                onload: resolve("Download finished"),
                onerror: (error, details) => reject({ error, details }),
            });

            if (context.configManager.findValueByKey("fastDL.saveTags")) {
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
            utils.debugLog("Downloading started", { url: post.download, filename });
        });
    }
    /**
     * 
     * @param {number} postId
     */
    static downloadPostById(postId) {
        loadPostItem(postId)
            .then(p => downloadPostItem(p)
                .then(() => utils.debugLog("Post item successfully downloaded", p))
                .catch((r) => utils.debugLog("Failed to download post item", { post: p, error: r.error, details: r.details })))
            .catch(e => utils.debugLog("Failed to load post item for", { post: e.target, id: postId, error: e }));
    }
    /**
     * Wildcard converter (*? supported)
     * @link https://stackoverflow.com/a/57527468
     * @param {string} wildcard 
     * @param {string} str 
     * @returns {boolean} If str matches wildcard
     */
    static wildTest(wildcard, str) {
        let w = wildcard.replace(/[.+^${}()|[\]\\]/g, '\\$&'); // regexp escape 
        const re = new RegExp(`^${w.replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');
        return re.test(str); // remove last 'i' above to have case sensitive
    }
}