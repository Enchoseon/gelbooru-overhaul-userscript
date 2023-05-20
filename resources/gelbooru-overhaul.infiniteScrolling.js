/**
 * @class Class that manages infinite scroll feature
 */
class InfiniteScrolling {
    /**
     * @callback InfiniteScrollingCallback
     * @param {HTMLImageElement[]} e
     */
    /**
     * break applying if hit last page
     * @type {boolean}
     */
    isInfiniteScrollHitLastPage = false;
    /**
     * prevent same page appended twice on slow connections
     * @type {boolean}
     */
    isBusy = false;
    /**
     * throttled/debounced (idk) apply function
     * 
     * 
     * calls only first time and waits at least 1000ms for next call
     */
    throttledApply = utils.debounceFirst(this.apply, 1000);
    /**
     * Stores all the dispatch handlers
     * @private
     * @type {InfiniteScrollingCallback[]}
     */
    dispatchHandlers = [];
    /**
     * Setup infScrolling with value
     * @public
     * @param {boolean} value 
     */
    setup(value) {
        if (value) document.addEventListener("scroll", e => this.check(e));
        else document.removeEventListener("scroll", e => this.check(e));
    }
    /**
     * Registers an event listener
     * @public
     * @param {InfiniteScrollingCallback} handler 
     * @returns {number} Number of listeners
     */
    addUpdateListener(handler) {
        return this.dispatchHandlers.push(handler);
    }
    /**
     * Infinite scroll event listener
     * @public
     * @param {Event} e 
     */
    check(e) {
        const threshold = Number(context.configManager.findValueByKey("infiniteScroll.threshold"));

        if (!this.isBusy && document.scrollingElement.scrollTop + document.scrollingElement.clientHeight >= document.scrollingElement.scrollHeight - threshold) {
            this.throttledApply();
        }
    }
    /**
     * Main function
     * @private
     */
    apply() {
        if (this.isInfiniteScrollHitLastPage) return;

        this.isBusy = true;

        let params = new URLSearchParams(document.URL.split('?')[1]);
        params.has("pid") ? params.set("pid", String(Number(params.get("pid")) + 42)) : params.set("pid", String(42));
        let nextPage = document.location.pathname + "?" + params;

        utils.debugLog(`InfScrolling to pid ${params.get("pid")}`);

        fetch(nextPage)
            .then(response => {
                if (!response.ok) throw Error(response.statusText);
                return response.text();
            })
            .then(text => {
                let parser = new DOMParser();
                let htmlDocument = parser.parseFromString(text, "text/html");

                let newThumbContainer = htmlDocument.querySelector(".thumbnail-container");
                let oldThumbContainer = document.querySelector(".thumbnail-container");

                if (!newThumbContainer || !newThumbContainer.childElementCount) {
                    utils.debugLog("InfScrolling hit last page");
                    this.isInfiniteScrollHitLastPage = true;
                    return;
                }

                Object.values(newThumbContainer.children).forEach(t => {
                    oldThumbContainer.appendChild(t);
                    this.dispatchHandlers.map(h => h([t.children[0].children[0]]));
                });

                let newPaginator = htmlDocument.querySelector(".pagination");
                let oldPaginator = document.querySelector(".pagination:not(.top-pagination)");
                oldPaginator.replaceWith(newPaginator);

                let oldTopPaginator = document.querySelector(".top-pagination");
                if (oldTopPaginator) {
                    /** @type {HTMLElement} */
                    let newTopPaginator = newPaginator.cloneNode(true);
                    newTopPaginator.classList.add("top-pagination");
                    oldTopPaginator.replaceWith(newTopPaginator);
                }

                window.history.pushState(nextPage, htmlDocument.title, nextPage);
                history.scrollRestoration = 'manual';
                document.title = htmlDocument.title;
            });
        this.isBusy = false;
    }
}