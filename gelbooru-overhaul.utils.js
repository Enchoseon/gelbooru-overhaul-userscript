class utils {
    /**
     * Styled console.log()
     * @param {string=}  message
     * @param {*=}       value 
     * @param {boolean}  [force]
     */
    static debugLog(message, value, force = false) {
        if (force || true ) {//configManager.config.general.items.debug.value) {
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
}