/**
     * @class Class that manages blacklist features
     */
 class BlacklistManager {
    /**
     * @typedef  BlacklistEntry
     * @type     {Object}
     * @property {string}  tag        Blacklisted tag
     * @property {boolean} isAnd      Describes if entry includes multiple tags
     * @property {number[]}  hits     Post ids affected by this entry
     * @property {boolean} isDisabled Describes if entry is disabled
     * @property {HTMLElement} [elem] Reference to displayed element
     * 
     * @typedef BlacklistItem
     * @type {Object}
     * @property {string} name
     * @property {string} value
     */
    /**
     * @type {BlacklistEntry[]}
     * @private
     */
    blacklistEntries;
    /**
     * @type {BlacklistItem}
     * @private
     */
    selectedBlacklistItem;
    /**
     * Total list of post ids affected by blacklist
     * @type {number[]}
     */
    totalHits;

    constructor() {
        if (!this.blacklistItems || this.blacklistItems.length == 0) {
            let item = { name: "Safe mode", value: "rating:q*\nrating:e*" };
            this.addUpdateBlacklist(item);
            let item2 = { name: "No blacklist", value: "" };
            this.addUpdateBlacklist(item2);

            let item3 = { name: "Test", value: "1girl" };
            this.addUpdateBlacklist(item3);
        }
    }
    /**
     * @private
     * @returns {BlacklistItem[]} List of available blacklists
     */
    get blacklistItems() {
        return GM_getValue("blacklists", undefined);
    }
    /**
     * @private
     * @param {BlacklistItem[]} value
     */
    set blacklistItems(value) {
        GM_setValue("blacklists", value);
    }
    /**
     * Adds/updates blacklist item to storage
     * @param {BlacklistItem} item 
     * @private
     */
    addUpdateBlacklist(item) {
        let items = this.blacklistItems;

        if (!items)
            items = [];

        let index = items.findIndex(i => i.name == item.name);

        if (index == -1) {
            items.push(item);
        } else {
            items[index] = item;
        }

        this.blacklistItems = items;

        this.updateSidebar();
    }
    /**
     * Removes blacklist item from storage
     * @param {BlacklistItem} item 
     * @private
     */
    removeBlacklist(item) {
        let index = this.blacklistItems.findIndex(i => i.name == item.name);

        this.blacklistItems.splice(index, 1);

        this.updateSidebar();
    }
    /**
     * Parse current blacklist item's entries
     */
    parseEntries() {
        this.blacklistEntries = [];

        let text = this.selectedBlacklistItem.value;
        let lines = text.split(/[\n|\r\n]/);
        lines = lines.filter((l) => {
            if (["", " ", "\n", "\r\n"].includes(l)) return false; // empty, space or newline
            if (l.startsWith("#") || l.startsWith("//")) return false; // comments

            return true;
        });

        // clear inline comments and trim spaces
        lines.map((l) => {
            return l.replace(/([\/\/|#].*)/, "").trim();
        });

        let entries = lines.map((l) => {
            /** @type {BlacklistEntry} */
            let entry = {
                tag: l.toLowerCase(),
                isAnd: Boolean(l.match(/ AND | && /)),
                hits: [],
                isDisabled: false
            };
            return entry;
        });

        this.blacklistEntries = entries;
    }
    /**
     * Updates blacklist sidebar placed above tags sidebar
     * @private
     */
    updateSidebar() {
        let aside = document.querySelector(".aside");
        
        let titleSpan = aside.querySelector("#go-advBlacklistTitle");
        let select = aside.querySelector("#go-advBlacklistSelect");
        let entries = aside.querySelector("#go-advBlacklistEntries");

        if (titleSpan) {
            // update existing
            //select
            while (select.firstChild) select.firstChild.remove();

            if (this.blacklistItems && this.blacklistItems.length > 0) {
                this.blacklistItems.forEach(i => {
                    let opt = document.createElement("option");
                    opt.value = i.name;
                    opt.textContent = i.name;
                    select.appendChild(opt);
                });
            } else {
                let opt = document.createElement("option");
                opt.value = "There is no blacklists";
                opt.textContent = "There is no blacklists";
                select.appendChild(opt);
                select.setAttribute("disabled", "");
            }

            if (this.selectedBlacklistItem) select.value = this.selectedBlacklistItem.name;

            //entries
            while (entries.firstChild) entries.firstChild.remove();
            if (this.blacklistEntries)
                this.blacklistEntries.forEach(i => {
                    let li = document.createElement("li");
                    li.className = "tag-type-general";

                    let a_tag = document.createElement("a");
                    a_tag.textContent = i.tag;

                    let span = document.createElement("span");
                    span.style.color = "#a0a0a0";
                    span.textContent = String(i.hits.length);

                    li.appendChild(a_tag);
                    li.appendChild(span);
                    entries.appendChild(li);
                });
        } else {
            // create new
            //title
            titleSpan = document.createElement("span");
            titleSpan.id = "go-advBlacklistTitle";

            titleSpan.appendChild(document.createElement("br"));

            let b = document.createElement("b");
            b.textContent = "Blacklist";
            b.style = "margin-left: 15px;";
            titleSpan.appendChild(b);

            titleSpan.appendChild(document.createElement("br"));
            titleSpan.appendChild(document.createElement("br"));


            //dropdown
            select = document.createElement("select");
            select.id = "go-advBlacklistSelect";

            if (this.blacklistItems && this.blacklistItems.length > 0) {
                this.blacklistItems.forEach(i => {
                    let opt = document.createElement("option");
                    opt.value = i.name;
                    opt.textContent = i.name;
                    select.appendChild(opt);
                });
            } else {
                let opt = document.createElement("option");
                opt.value = "There is no blacklists";
                opt.textContent = "There is no blacklists";
                select.appendChild(opt);
                select.setAttribute("disabled", "");
            }

            select.addEventListener("change", e => this.selectedBlacklistChanged(e.target.value));

            //entries
            entries = document.createElement("ul");
            entries.id = "go-advBlacklistEntries";
            entries.className = "tag-list";

            if (this.blacklistEntries)
                this.blacklistEntries.forEach(i => {
                    let li = document.createElement("li");
                    li.className = "tag-type-general";

                    let a_tag = document.createElement("a");
                    a_tag.textContent = i.tag;

                    let span = document.createElement("span");
                    span.style.color = "#a0a0a0";
                    span.textContent = String(i.hits.length);

                    li.appendChild(a_tag);
                    li.appendChild(span);
                    entries.appendChild(li);
                });
            
            aside.insertBefore(entries, aside.children[0])
            aside.insertBefore(select, entries);
            aside.insertBefore(titleSpan, select);
        }
    }
    /**
     * Removes blacklist sidebar placed above tags sidebar
     * @private
     */
    removeSidebar() {
        let aside = document.querySelector(".aside");
        let title = aside.querySelector("#go-advBlacklistTitle");
        let select = aside.querySelector("#go-advBlacklistSelect");
        let entries = aside.querySelector("#go-advBlacklistEntries");


        if (title) {
            title.remove();
            select.remove();
            entries.remove();
        }
    }
    /**
     * Enable/disable blacklist manager
     * @param {boolean} value 
     * @public
     */
    setupManager(value) {
        if (value) {
            if(this.blacklistItems) this.selectedBlacklistChanged(this.blacklistItems[0].name);
            else this.updateSidebar();
        } else {
            this.removeSidebar();
        }
    }
    /**
     * Listeren for blacklist select onchange
     * @param {string} name 
     */
    selectedBlacklistChanged(name) {
        // clear blacklisted posts
        this.selectedBlacklistItem = this.blacklistItems.find(i => i.name == name);

        this.parseEntries();
        this.applyBlacklist().then(() => {

        this.updateSidebar();
        });
    }
    async applyBlacklist() {
        let thumbs = utils.getThumbnails();
        let promises = Object.values(thumbs).map(t => {
            let id = Number(/id=([0-9]+)/.exec(t.parentElement.getAttribute("href"))[1]);
            return utils.loadPostItem(id).then(i => i);
        });

        await Promise.all(promises).then(items => {
            this.totalHits = [];

            items.forEach(item => {
                if (this.applyPost(item)) this.totalHits.push(item.id);
            });
        });
    }
    /**
     * 
     * @param {PostItem} item 
     * @returns {boolean} Is post was hit by any entry
     */
    applyPost(item) {
        let isHit = false;

        this.blacklistEntries.forEach(e => {
            if (this.checkEntryHit(item, e)) {
                isHit = true;
                e.hits.push(item.id);
            }
        })

        return isHit;
    }
    /**
     * 
     * @param {PostItem} post 
     * @param {BlacklistEntry} entry 
     * @returns {boolean} Is post was hit with given entry
     */
    checkEntryHit(post, entry) {
        if (entry.isDisabled) return false;

        let postTags = post.tags.artist.concat(post.tags.character, post.tags.copyright, post.tags.general, post.tags.metadata);

        if (entry.isAnd) {
            let tags = entry.tag.split(/ AND | && /);
            if (tags.every(t => postTags.some(tt => utils.wildTest(t, tt)) )) return true;
        }

        if (postTags.some(tt => utils.wildTest(entry.tag, tt) )) return true;

        return false;
    }
}
