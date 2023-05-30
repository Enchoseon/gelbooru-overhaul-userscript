class context {
    /** @type {ConfigManager} */
    static configManager;
    /** @type {BlacklistManager} */
    static blacklistManager;
    /** @type {ThemeManager} */
    static themeManager;
    /** @type {InfiniteScrolling} */
    static infiniteScrolling;
    /** 
     * @see {utils.pageTypes}
     * @type {string} */
    static pageType;
}
/**
 * @class Wrapper for Fetch method to make it more reliable
 * @link Inspired by (mostly borrowed) https://github.com/evan-liu/fetch-queue
 */
class RepeatFetchQueue {
    /**
     * @typedef {Object} QueueItem
     * @property {string} Url
     * @property {Function} Resolve
     * @property {Function} Reject
     * @property {string} State
     * @property {number} Retries
     */
    ItemStates = { Pending: "Pending", Active: "Active", Succeeded: "Succeeded", Failed: "Failed" };

    /** @type {number} */
    parallelRequests;
    /** @type {number} */
    maxRetryCount;

    /** @type {QueueItem[]} */
    pendingItems;
    /** @type {QueueItem[]} */
    activeItems;

    constructor(parallelRequests = 5, maxRetryCount = 5) {
        this.parallelRequests = parallelRequests;
        this.maxRetryCount = maxRetryCount;

        this.pendingItems = [];
        this.activeItems = [];
    }

    /**
     * Main method to enqueue Fetch request
     * @param {string} url 
     * @returns {Promise}
     */
    Fetch(url) {
        /** @type {QueueItem} */
        let item;

        const promise = new Promise((resolve, reject) => {
            item = {
                Url: url,
                Resolve: resolve,
                Reject: reject,
                State: this.ItemStates.Pending,
                Retries: this.maxRetryCount
            };
            this.pendingItems.push(item);
        });
        this.checkNext();

        return promise;
    }

    /**
     * @private
     */
    checkNext() {
        while (this.pendingItems.length > 0 && this.activeItems.length < this.parallelRequests) {
            const item = this.pendingItems.shift();
            this.activeItems.push(item);
            item.State = this.ItemStates.Active;

            fetch(item.Url).then(
                (response) => {
                    if (response.ok) this.handleResult(item, this.ItemStates.Succeeded, response);
                    else if (response.status == 429) {
                        utils.debugLog("Hit rate limit, waiting 15 seconds");
                        setTimeout(() => { this.reQueueItem(item, response.statusText); }, 15000);
                    } else
                        this.reQueueItem(item, response.statusText);
                },
                (reason) => this.reQueueItem(item, reason)
            );
        }
    }
    /**
     * @private
     * @param {QueueItem} item
     * @param {string} state
     * @param {any} result
     */
    handleResult(item, state, result) {
        this.activeItems = this.activeItems.filter((i) => i != item);
        if (item.State == this.ItemStates.Active) {
            item.State = state;

            if (state == this.ItemStates.Succeeded) item.Resolve(result);
            else item.Reject(result);
        }

        this.checkNext();
    }

    /**
     * 
     * @param {QueueItem} item 
     * @param {any} reason 
     */
    reQueueItem(item, reason) {
        item.Retries--;

        if (item.Retries > 0) {
            item.State = this.ItemStates.Pending;
            this.pendingItems.push(item);
            this.activeItems = this.activeItems.filter(i => i != item);
        }
        else if (item.Retries == 0) {
            this.handleResult(item, this.ItemStates.Failed, reason);
        }
        this.checkNext();
    }
}
class utils {
    /** @var {Object.<string, string>} Enum with available page types */
    static pageTypes = Object.freeze({ GALLERY: "gallery", POST: "post", WIKI_VIEW: "wiki_view", POOL_VIEW: "pool_view", UNDEFINED: "undefined" });
    /**
     * Current page type (see {@link utils.pageTypes})
     * @returns {string}
     */
    /**
     * Runs func when document is ready
     * @param {function} func 
    */
    static onDOMReady(func) {
        if (document.readyState == "interactive" || document.readyState == "complete") {
            func();
        } else {
            document.addEventListener("DOMContentLoaded", () => func());
        }
    }
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
     * Recursive merge source into target—changes source.
     * @link https://gist.github.com/ahtcx/0cd94e62691f539160b32ecda18af3d6?permalink_comment_id=3889214#gistcomment-3889214
     * @param {Object} source 
     * @param {Object} target 
     * @returns {*} source merged into target
     */
    static mergeRecursive(source, target) {
        for (const [key, val] of Object.entries(source)) {
            if (val !== null && typeof val === `object`) {
                if (target[key] === undefined) {
                    target[key] = new val.__proto__.constructor();
                }
                utils.mergeRecursive(val, target[key]);
            } else {
                target[key] = val;
            }
        }
        return target; // we're replacing in-situ, so this is more for chaining than anything else
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
                const text = "More Like This: (Beta Temporary Feature)";
                return [...document.querySelectorAll(".mainBodyPadding > div > div")].filter(i => i.textContent == text)[0].parentElement.querySelectorAll("a > img");
            default:
                return undefined;
        }
    }
    /**
     * 
     * @param {HTMLImageElement} thumb 
     * @returns {number}
     */
    static getThumbPostId(thumb) {
        return Number(/id=([0-9]+)/.exec(thumb.parentElement.getAttribute("href"))[1]);
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
    static GM_setValueThrottle = utils.throttle((v) => GM_setValue("postCache", v), 1000);
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
    /** @type {RepeatFetchQueue} */
    static fetchQueue = new RepeatFetchQueue(12, 5);
    /**
     * Cache and return post item
     * @param {number} postId 
     * @returns {Promise<PostItem>}
     */
    static async loadPostItem(postId) {
        // just clear postCache if exceeded limit
        if (Object.keys(utils.postCache).length > context.configManager.findValueByKey("general.maxCache"))
            utils.postCache = {};

        if (!utils.postCache[postId]) {
            return this.fetchQueue.Fetch("https://" + window.location.host + "/index.php?page=dapi&s=post&q=index&json=1&id=" + postId)
                .then(response => response.json())
                .then(json => {
                    let post = json.post[0];

                    let fileLink = post.file_url;
                    let highResThumb = fileLink.startsWith("https://video") ? fileLink.replace(new RegExp(/\.([^\.]+)$/, "gm"), ".jpg") : fileLink;
                    let md5 = post.md5;

                    if (!highResThumb || !fileLink) throw new Error("Failed to parse url");

                    let tags = {
                        artist: [],
                        character: [],
                        copyright: [],
                        metadata: [],
                        general: post.tags.split(" ").map(t => t.replaceAll("_", " ")),
                    };

                    let score = post.score;
                    let rating = post.rating;

                    utils.postCache[postId] = {
                        highResThumb: highResThumb,
                        download: fileLink,
                        tags: tags,
                        md5: md5,
                        id: postId,
                        score: Number(score),
                        rating: rating
                    };

                    utils.postCacheSave();
                    return utils.postCache[postId];
                })
                .catch(error => Promise.reject(error));
        } else
            return utils.postCache[postId];
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
        if (wildcard.includes("*") || wildcard.includes("?")) {
            let w = wildcard.replace(/[.+^${}()|[\]\\]/g, '\\$&'); // regexp escape 
            const re = new RegExp(`^${w.replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');
            return re.test(str); // remove last 'i' above to have case sensitive
        } else {
            return str == wildcard;
        }
    }
    /**
     * Set/create innerHTML of a <style> elem by its id
     * @param {string} id
     * @param {string} css
     */
    static setDynamicStyle(id, css) {
        /** @type {HTMLStyleElement} */
        let styleElem = document.getElementById(id);
        if (!styleElem) {
            GM_addElement("style", {
                id: id,
                textContent: css
            });
        } else {
            styleElem.textContent = css
        }
    }
}
