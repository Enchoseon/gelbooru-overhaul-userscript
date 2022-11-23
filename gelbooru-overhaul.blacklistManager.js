/**
     * @class Class that manages blacklist features
     */
class BlacklistManager {
    /**
     * @typedef  BlacklistEntry
     * @type     {Object}
     * @property {string}  [tag]        Blacklisted tag
     * @property {string[]} [tags]      Blacklisted tags if AND
     * @property {boolean} isAnd      Describes if entry includes multiple tags
     * @property {number[]}  hits     Post ids affected by this entry
     * @property {boolean} isDisabled Describes if entry is disabled
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
    /** @type {Number} */
    totalPosts;

    constructor() {
        if (!this.blacklistItems || this.blacklistItems.length == 0) {
            let item = { name: "Safe mode", value: "rating:q*\nrating:e*" };
            let item2 = { name: "No blacklist", value: "" };

            this.blacklistItems = [item, item2];
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

        if (this.selectedBlacklistItem && this.selectedBlacklistItem.name) this.selectedBlacklistChanged(item.name);
        this.updateSidebarSelect();

        let nameList = document.querySelector("#go-advBlacklistListNames");
        while (nameList && nameList.firstChild) nameList.firstChild.remove();

        this.blacklistItems.forEach(i => {
            let option = document.createElement("option");
            option.value = i.name;
            nameList.appendChild(option);
        });
    }
    /**
     * Removes blacklist item from storage
     * @param {BlacklistItem} item 
     * @private
     */
    removeBlacklist(item) {
        if (item.name == "Safe mode" || item.name == "No blacklist") return;

        let index = this.blacklistItems.findIndex(i => i.name == item.name);

        let items = this.blacklistItems;
        items.splice(index, 1);
        this.blacklistItems = items;

        this.updateSidebarSelect();

        let nameList = document.querySelector("#go-advBlacklistListNames");
        while (nameList.firstChild) nameList.firstChild.remove();

        this.blacklistItems.forEach(i => {
            let option = document.createElement("option");
            option.value = i.name;
            nameList.appendChild(option);
        });
    }
    registerEditWinow() {
        let eDiv = buildEditWindow(this);
        document.querySelector("#container").appendChild(eDiv);

        /** @param {BlacklistManager} scope*/
        function buildEditWindow(scope = this) {
            /** @type {HTMLDivElement} */
            let sDiv = document.createElement("div");
            sDiv.className = "go-config-window go-config-window-hidden";
            sDiv.id = "goBlacklistEditWindow";

            let header = document.createElement("header");
            header.className = "topnav";
            let headerA = document.createElement("a");
            headerA.textContent = "Edit blacklist";
            header.appendChild(headerA);

            let mainContent = document.createElement("dl");
            let textInputLI = document.createElement("li");
            let nameInputLI = document.createElement("li");
            nameInputLI.className = "text-input";

            let nameInputLabel = document.createElement("label");
            nameInputLabel.textContent = "Blacklist name";
            nameInputLabel.setAttribute("for", "NameInput");
            let nameInputDescript = document.createElement("p");
            nameInputDescript.textContent = "Input or select name (content will be replaced)";

            let textInputLabel = document.createElement("label");
            textInputLabel.textContent = "Blacklist entries";
            let textInputDescript = document.createElement("p");
            textInputDescript.style.whiteSpace = "pre";
            textInputDescript.textContent = "Input blacklist entries\nEach item on new line\nSupports wildcards\nSupports AND, comments (//, #), not sensitive to ' ' and '_'";

            let textInput = document.createElement("textarea");

            let nameInput = document.createElement("input");
            nameInput.setAttribute("list", "go-advBlacklistListNames");
            nameInput.name = "NameInput";
            nameInput.addEventListener("input", e => {
                let foundItem = scope.blacklistItems.find(i => i.name == nameInput.value);

                if (foundItem) textInput.value = foundItem.value;
            });

            let nameList = document.createElement("datalist");
            nameList.setAttribute("id", "go-advBlacklistListNames");
            scope.blacklistItems.forEach(i => {
                let option = document.createElement("option");
                option.value = i.name;
                nameList.appendChild(option);
            });

            nameInputLI.appendChild(nameInputLabel);
            nameInputLI.appendChild(nameInput);
            nameInputLI.appendChild(nameInputDescript);

            textInputLI.appendChild(textInputLabel);
            textInputLI.appendChild(textInput);
            textInputLI.appendChild(textInputDescript);

            mainContent.appendChild(nameInputLI);
            mainContent.appendChild(textInputLI);
            mainContent.appendChild(nameList);

            let footer = document.createElement("footer");
            let submitClose = document.createElement("input");
            submitClose.type = "submit";
            submitClose.className = "searchList";
            submitClose.value = "Close";
            submitClose.title = "Close window without saving";
            submitClose.addEventListener("click", () => {
                sDiv.classList.add("go-config-window-hidden");
            });

            let submitSave = document.createElement("input");
            submitSave.type = "submit";
            submitSave.className = "searchList";
            submitSave.value = "Save";
            submitSave.title = "Add or update blacklist";
            submitSave.addEventListener("click", () => {
                if (nameInput.value == "") return;

                /** @type {BlacklistItem} */
                let foundItem = scope.blacklistItems.find(i => i.name == nameInput.value);

                if (!foundItem) foundItem = { name: nameInput.value, value: textInput.value };
                foundItem.value = textInput.value;

                scope.addUpdateBlacklist(foundItem);

                sDiv.classList.add("go-config-window-hidden");
            });

            let submitDelete = document.createElement("input");
            submitDelete.type = "submit";
            submitDelete.className = "searchList";
            submitDelete.value = "Delete";
            submitDelete.title = "Delete selected blacklist";
            submitDelete.addEventListener("click", () => {
                /** @type {BlacklistItem} */
                let foundItem = scope.blacklistItems.find(i => i.name == nameInput.value);

                if (!foundItem) return;

                scope.removeBlacklist(foundItem);

                sDiv.classList.add("go-config-window-hidden");
            });

            footer.appendChild(submitClose);
            footer.appendChild(submitSave);
            footer.appendChild(submitDelete);

            sDiv.appendChild(header);
            sDiv.appendChild(mainContent);
            sDiv.appendChild(footer);

            return sDiv;
        }
    }
    removeEditWindow() {
        document.querySelector("#container > #goBlacklistEditWindow").remove();
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
        lines = lines.map((l) => {
            return l.replace(/([\/\/|#].*)/, "").trim();
        });

        // clear namespace excep rating:
        lines = lines.map(l => {
            return l.replace(/^(?!rating:)(?:.+:)(.+)$/, "$1");
        });

        // fix spaces and lowercase
        lines = lines.map(l => l.replaceAll(" AND ", " && ").replaceAll("_", " ").toLowerCase());

        // deduplicate
        lines = [...new Set(lines)];

        let entries = lines.map((l) => {
            if (Boolean(l.match(/ && /))) {
                /** @type {BlacklistEntry} */
                let entry = {
                    tags: l.split(/ && /),
                    isAnd: true,
                    hits: [],
                    isDisabled: false
                };
                return entry;
            } else {
                /** @type {BlacklistEntry} */
                let entry = {
                    tag: l,
                    isAnd: false,
                    hits: [],
                    isDisabled: false
                };
                return entry;
            }
        });

        this.blacklistEntries = entries;
    }
    /**
     * 
     * @param {BlacklistEntry} entry 
     * @param {boolean} force 
     */
    toggleEntry(entry, force = undefined, skipStorageSet = false) {
        if (force)
            entry.isDisabled = force;
        else
            entry.isDisabled = !entry.isDisabled;

        let thumbs = utils.getThumbnails();

        if (entry.isDisabled) {
            entry.hits.forEach(id => {
                if (!this.blacklistEntries
                    .filter(e => !(e.hits.length == 0 || e.isDisabled || e == entry))
                    .some(e => e.hits.includes(id)))

                    Object.values(thumbs)
                        .find(t => utils.getThumbPostId(t) == id)
                        .classList.toggle("go-blacklisted", false);

            });
        } else {
            entry.hits.forEach(id => {
                Object.values(thumbs)
                    .find(t => utils.getThumbPostId(t) == id)
                    .classList.toggle("go-blacklisted", true);
            });
        }

        this.updateSidebarTitle();
        this.updateSidebarEntries();

        if (!skipStorageSet)
            this.storageSetDisbledEntries(JSON.stringify(this.blacklistEntries.filter(e => e.isDisabled)));
    }
    /**
     * 
     * @param {BlacklistEntry[]} entries 
     * @param {boolean} force 
     */
    toggleEntries(entries = undefined, force = undefined, skipStorageSet = false) {
        if (!entries) entries = this.blacklistEntries;
        if (entries.length < 1) return;

        if (force == undefined) force = !entries[0].isDisabled;

        entries.forEach(e => e.isDisabled = force);

        let thumbs = utils.getThumbnails();

        this.totalHits.forEach(id => {
            Object.values(thumbs)
                .find(t => /id=([0-9]+)/.exec(t.parentElement.getAttribute("href"))[1] == id.toString())
                .classList.toggle("go-blacklisted", !force);
        });

        this.updateSidebarTitle();
        this.updateSidebarEntries();

        if (!skipStorageSet)
            this.storageSetDisbledEntries(JSON.stringify(this.blacklistEntries.filter(e => e.isDisabled)));
    }

    /**
     * Creates blacklist sidebar placed above tags sidebar
     * @private
     */
    createSidebar() {
        //title
        let titleSpan = document.createElement("span");
        titleSpan.id = "go-advBlacklistTitle";

        let b = document.createElement("b");
        b.textContent = `Blacklist`;

        titleSpan.appendChild(document.createElement("br"));
        titleSpan.appendChild(b);
        titleSpan.appendChild(document.createElement("br"));
        titleSpan.appendChild(document.createElement("br"));

        //select
        let select = document.createElement("select");
        select.id = "go-advBlacklistSelect";
        select.addEventListener("change", e => this.selectedBlacklistChanged(e.target.value));

        //select edit
        let edit = document.createElement("svg");
        edit.innerHTML = '<svg class="go-svg" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="currentColor" d="m19.3 8.925l-4.25-4.2l1.4-1.4q.575-.575 1.413-.575q.837 0 1.412.575l1.4 1.4q.575.575.6 1.388q.025.812-.55 1.387ZM17.85 10.4L7.25 21H3v-4.25l10.6-10.6Z"/></svg>';
        edit.addEventListener("click", (e) => {
            document.querySelector("#container > #goBlacklistEditWindow").classList.toggle("go-config-window-hidden");
        });
        //entries
        let entries = document.createElement("ul");
        entries.id = "go-advBlacklistEntries";
        entries.className = "tag-list";

        //insert elements (reverse order)
        let aside = document.querySelector(".aside");
        aside.insertBefore(entries, aside.firstChild);
        aside.insertBefore(edit, aside.firstChild);
        aside.insertBefore(select, aside.firstChild);
        aside.insertBefore(titleSpan, aside.firstChild);
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
    updateSidebarTitle() {
        let thumbs = Object.values(utils.getThumbnails());

        document.querySelector("#go-advBlacklistTitle").querySelector("b").textContent =
            `Blacklist ${thumbs.filter(e => e.classList.contains("go-blacklisted")).length}/${thumbs.length}`;
    }
    updateSidebarSelect() {
        /** @type {HTMLSelectElement} */
        let select = document.querySelector("#go-advBlacklistSelect");

        while (select.firstChild) select.firstChild.remove();

        if (this.blacklistItems && this.blacklistItems.length > 0) {
            this.blacklistItems.forEach(i => select.appendChild(buildBlacklistItem(i)));
        } else {
            select.appendChild(buildBlacklistItem(null));
        }

        if (this.selectedBlacklistItem) select.value = this.selectedBlacklistItem.name;

        function buildBlacklistItem(i) {
            let opt = document.createElement("option");

            if (i == null) {
                opt.value = "There is no blacklists";
                opt.textContent = "There is no blacklists";
                select.setAttribute("disabled", "");
            } else {
                opt.value = i.name;
                opt.textContent = i.name;
            }

            return opt;
        }
    }
    updateSidebarEntries() {
        let entries = document.querySelector("#go-advBlacklistEntries");

        while (entries.firstChild) entries.firstChild.remove();

        if (this.blacklistEntries && this.blacklistEntries.length > 0) {
            this.blacklistEntries.filter(i => i.hits.length > 0).forEach(i => entries.appendChild(buildEntryItem(i, this)));
            if (entries.childElementCount > 1) entries.appendChild(buildDisableAll(this));
        }
        /** @param {BlacklistManager} scope @param {BlacklistEntry} i*/
        function buildEntryItem(i, scope = this) {
            let li = document.createElement("li");
            li.className = "tag-type-general";

            let a_tag = document.createElement("a");
            a_tag.textContent = i.isAnd ? i.tags.join(" && ") : i.tag;
            a_tag.addEventListener("click", e => { scope.toggleEntry(i); });
            a_tag.classList.toggle("go-advBlacklistDisabledEntry", i.isDisabled);
            a_tag.href = "javascript:;";

            let separator = document.createElement("a");
            separator.textContent = " ";

            let span = document.createElement("span");
            span.style.color = "#a0a0a0";
            span.textContent = String(i.hits.length);

            li.appendChild(a_tag);
            li.appendChild(separator);
            li.appendChild(span);

            return li;
        }
        /** @param {BlacklistManager} scope */
        function buildDisableAll(scope = this) {
            let li = document.createElement("li");
            li.className = "tag-type-general";

            let state = scope.blacklistEntries.every(e => e.isDisabled);

            let a_tag = document.createElement("a");
            a_tag.textContent = state ? "Enable all" : "Disable all";
            a_tag.addEventListener("click", e => scope.toggleEntries(scope.blacklistEntries, !state));
            a_tag.href = "javascript:;";

            li.appendChild(a_tag);

            return li;
        }
    }

    /**
     * Enable/disable blacklist manager
     * @param {boolean} value 
     * @public
     */
    setupManager(value) {
        if (value) {
            this.registerEditWinow();
            this.createSidebar();

            if (this.blacklistItems) {
                let stored = this.storageGetBlacklist();
                if (stored)
                    this.selectedBlacklistChanged(stored);
                else
                    this.selectedBlacklistChanged(this.blacklistItems[0].name);
            }
            this.updateSidebarSelect();
        } else {
            this.removeSidebar();
            this.removeEditWindow();
        }
    }
    /**
     * Listeren for blacklist select onchange
     * @param {string} name 
     */
    async selectedBlacklistChanged(name) {
        this.selectedBlacklistItem = this.blacklistItems.find(i => i.name == name);

        this.totalHits = [];
        this.totalPosts = 0;

        this.parseEntries();
        await this.applyBlacklist().then(() => {
            if (this.selectedBlacklistItem.name == this.storageGetBlacklist()) {
                let entrStr = this.storageGetDisabledEntries();
                if (entrStr == null || entrStr == "") return;

                let entries = JSON.parse(entrStr);
                entries.forEach(entry => {
                    let found = this.blacklistEntries.find(e =>
                        e.tag == entry.tag ||
                        e.tags && entry.tags &&
                        e.tags.every((v, i) => v == entry.tags[i]));
                    if (found) this.toggleEntry(found, true, true);
                });

                this.updateSidebarTitle();
                this.updateSidebarEntries();
            } else {
                this.storageSetBlacklist(this.selectedBlacklistItem.name);
                this.storageSetDisbledEntries("[]");
            }
        });
    }

    applyBlacklist(thumbs = null) {
        return new Promise(async (resolve) => {
            if (!thumbs) {
                thumbs = utils.getThumbnails();
                this.totalPosts = Object.values(thumbs).length;
            } else {
                this.totalPosts += Object.values(thumbs).length;
            }


            await this.checkPosts(thumbs).then(() => {
                this.hidePosts(thumbs);
                this.updateSidebarTitle();
                this.updateSidebarEntries();
            });

            resolve();
        });
    }
    async checkPosts(thumbs) {
        await Promise.all(Object.values(thumbs).map(async (t) => await utils.loadPostItem(utils.getThumbPostId(t)).then(i => i)))
            .then(async items => {
                await Promise.all(items.map(async item => {
                    await this.checkPost(item).then(result => {
                        if (result) this.totalHits.push(item.id);
                    });
                }));
            });
    }
    hidePosts(thumbs) {
        Object.values(thumbs).forEach(t => {
            if (this.blacklistEntries.filter(e => !e.isDisabled && e.hits.length > 0).some(e => e.hits.includes(utils.getThumbPostId(t))))
                t.parentElement.parentElement.classList.toggle("go-blacklisted", true);
            else
                t.parentElement.parentElement.classList.toggle("go-blacklisted", false);
        });
    }
    /**
     * 
     * @param {PostItem} item 
     * @returns {Promise<boolean>} Is post was hit by any entry
     */
    checkPost(item) {
        // O(post count * blacklist entries count)
        return new Promise(async resolve => {
            let isHit = false;

            await Promise.all(this.blacklistEntries.map(async e => await this.checkEntryHit(item, e)))
                .then(retarr => {
                    retarr.forEach(ret => {
                        if (ret.isHit) {
                            ret.entry.hits.push(item.id);
                            isHit = true;
                        }
                    });
                })
                .then(() => {
                    resolve(isHit);
                });
        });
    }
    /**
     * 
     * @param {PostItem} post 
     * @param {BlacklistEntry} entry 
     * @returns {Promise<{entry:BlacklistEntry, isHit:boolean}>} Is post was hit with given entry
     */
    checkEntryHit(post, entry) {
        return new Promise(resolve => {
            let postTags = post.tags.artist.concat(post.tags.character, post.tags.copyright, post.tags.general, post.tags.metadata);
            postTags = postTags.concat([`rating:${post.rating}`]);

            if (entry.isAnd) {
                if (entry.tags.every(t => postTags.some(tt => utils.wildTest(t, tt)))) resolve({ entry, isHit: true });
            } else {
                if (postTags.some(tt => utils.wildTest(entry.tag, tt))) resolve({ entry, isHit: true });
            }

            resolve({ entry, isHit: false });
        });
    }

    storageSetBlacklist(name) {
        localStorage.setItem("go-blacklist", name);
    }
    storageGetBlacklist() {
        let name = localStorage.getItem("go-blacklist");

        return name;
    }
    storageSetDisbledEntries(entries) {
        sessionStorage.setItem("go-blacklist-disabled", entries);
    }
    storageGetDisabledEntries() {
        return sessionStorage.getItem("go-blacklist-disabled");
    }
}
