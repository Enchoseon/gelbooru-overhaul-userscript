// Apply CSS Variables
/** @type {PreferenceUpdateCallback} */
async function applyCssVariableGoCollapseSidebar() {
    utils.debugLog("Applying css variable #goCollapseSidebarVariables");
    utils.setDynamicStyle("goCollapseSidebarVariables", `
        .go-collapse-sidebar {
            --collapsed-width: ${context.configManager.findValueByKey("collapsibleSidebar.width")};
            --collapsed-color: ${context.configManager.findValueByKey("collapsibleSidebar.color")};
            --expanded-opacity: ${context.configManager.findValueByKey("collapsibleSidebar.opacity")};
        }
        .go-collapse-sidebar-container-tweak {
            --collapsed-width: ${context.configManager.findValueByKey("collapsibleSidebar.width")};
        }
    `);
}
/** @type {PreferenceUpdateCallback} */
async function applyCssVariableGoThumbnailEnlarge() {
    utils.debugLog("Applying css variable #goThumbnailEnlargeVariables");
    utils.setDynamicStyle("goThumbnailEnlargeVariables", `
        .go-thumbnail-enlarge {
            --enlarge-scale: ${context.configManager.findValueByKey("thumbs.scale")};
        }
    `);
}
/** @type {PreferenceUpdateCallback} */
async function applyCssVariableGoThumbnailResize() {
    utils.debugLog("Applying css variable #goThumbnailResizeVariables");
    utils.setDynamicStyle("goThumbnailResizeVariables", `
        .go-thumbnail-resize {
            --thumb-gallery-size: ${context.configManager.findValueByKey("thumbs.resizeGallerySize")};
            --thumb-morelikethis-size: ${context.configManager.findValueByKey("thumbs.resizeMoreLikeThisSize")};
        }
    `);
}
/** @type {PreferenceUpdateCallback} */
async function applyCssVariableBlacklist() {
    utils.debugLog("Applying css variable .go-blacklisted");

    let filter = context.configManager.findValueByKey("advancedBlacklist.hideFilter");
    let collapse = context.configManager.findValueByKey("advancedBlacklist.hideMode");
    let show = context.configManager.findValueByKey("advancedBlacklist.showOnHover");
    let disableHover = context.configManager.findValueByKey("advancedBlacklist.enlargeOnHover");

    utils.setDynamicStyle("goBlacklistVariables", `
        .go-blacklisted {
            --blacklist-filter: ${filter};
            ${collapse == "Collapse" ? "--blacklist-visibility: none;" : ""}

            --blacklist-hoverFilter: ${show ? "100%" : filter};
            ${disableHover ? "" : "--disable-blacklist-enlarge: 1;"}
        }
    `);
}

// Apply Tweak
//      Collapsible sidebar
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value
 */
async function applyTweakCollapseSidebar(value) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;

    utils.debugLog(`Applying TweakCollapseSidebar state: ${String(value)}`);

    document.querySelector("#container > section").classList.toggle("go-collapse-sidebar", value);
    document.querySelector("#tag-list").classList.toggle("go-tag-list-top-bottom-padding", value);

    document.querySelectorAll("#tag-list > li[class^='tag-type']").forEach((i) => { i.classList.toggle("go-collapse-sidebar-tags-list-tweak", value); });
    document.querySelector("#container").classList.toggle("go-collapse-sidebar-container-tweak", value);
    Object.values(document.getElementsByClassName("mobile-spacing")).forEach((i) => { i.classList.toggle("go-mobile-unspacing", value); });
    Object.values(document.getElementsByClassName("sm-hidden")).forEach((i) => { i.classList.toggle("go-sm-unhidden", value); });

}
//      Post
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value 
 */
async function applyTweakPostFit(value) {
    if (context.pageType != utils.pageTypes.POST) return;
    utils.debugLog(`Applying PostFit state: ${String(value)}`);

    document.querySelectorAll(".note-container, #image, #gelcomVideoPlayer").forEach(i => {
        i.classList.toggle("go-fit-height", value);
        i.classList.toggle("fit-width", !value);
    });

    let resizeLink = document.querySelector("#resize-link > a");
    if (resizeLink) {
        if (value)
            resizeLink.addEventListener("click", toggleFitMode);
        else
            resizeLink.removeEventListener("click", toggleFitMode);
    }

}
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value 
 */
async function applyTweakPostCenter(value) {
    if (context.pageType != utils.pageTypes.POST) return;
    utils.debugLog(`Applying PostCenter state: ${String(value)}`);

    document.querySelectorAll(".note-container, #image, #gelcomVideoPlayer").forEach(i => {
        i.classList.toggle("go-center", value);
    });
}
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value 
 */
async function applyTweakPostAutoScroll(value) {
    if (context.pageType != utils.pageTypes.POST) return;
    utils.debugLog(`Applying PostAutoScroll state: ${String(value)}`);

    if (value)
        document.addEventListener("readystatechange", autoScroll);
    else
        document.removeEventListener("readystatechange", autoScroll);
}
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value 
 */
async function applyTweakPostOnNarrow(value) {
    if (context.pageType != utils.pageTypes.POST) return;
    utils.debugLog(`Applying PostOnNarrow state: ${String(value)}`);

    document.querySelectorAll(".note-container, #image, #gelcomVideoPlayer").forEach(i => {
        i.classList.toggle("go-fit-width-on-narrow", value);
    });
}
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value 
 */
async function applyTweakPostClickSwitchFit(value) {
    if (context.pageType != utils.pageTypes.POST) return;
    utils.debugLog(`Applying PostClickSwitchFit state: ${String(value)}`);

    let img = document.querySelector("#image");
    let resizeLink = document.querySelector("#resize-link > a");

    if (!img || !resizeLink)
        return;

    if (value) {
        img.classList.add("go-cursor-zoom-in");
        img.addEventListener("click", toggleFitModeWithCursors);
    } else {
        img.classList.remove("go-cursor-zoom-in");
        img.classList.remove("go-cursor-zoom-out");
        img.removeEventListener("click", toggleFitModeWithCursors);
    }
}
//      Thumbs
/**
* @type {PreferenceUpdateCallback}
* @param {boolean} value
* @param {HTMLImageElement[]} thumbs
*/
async function applyTweakEnlargeOnHover(value, thumbs = null) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;

    utils.debugLog(`Applying EnlargeOnHover state: ${String(value)}`);

    if (!thumbs) thumbs = utils.getThumbnails();
    thumbs.forEach((i) => {
        i.parentElement.classList.toggle("go-thumbnail-enlarge", value);

        if (context.pageType == utils.pageTypes.POST)
            i.style.margin = '';
        i.parentElement.style.margin = '10px'; //TODO: css
    });


    // Dependent tweak
    applyTweakLoadHighRes(Boolean(context.configManager.findValueByKey("thumbs.highRes")));
    applyTweakPreventOffScreen(Boolean(context.configManager.findValueByKey("thumbs.preventOffScreen")));
}
/** 
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value
 */
async function applyTweakLoadHighRes(value) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;

    // Dependencies check
    let dependValue = context.configManager.findValueByKey("thumbs.enlargeOnHover") && value;

    utils.debugLog(`Applying LoadHighRes state: ${String(dependValue)}`);

    utils.getThumbnails().forEach((i) => {
        if (dependValue) {
            i.setAttribute("data-thumb-src", i.src);
            i.addEventListener("mouseenter", setImageHighResSource);
            i.addEventListener("mouseleave", setImageLowResSource);
        } else {
            i.removeEventListener("mouseenter", setImageHighResSource);
            i.removeEventListener("mouseleave", setImageLowResSource);
        }
    });

    // Dependent tweak
    applyTweakLoadingIndicator(Boolean(context.configManager.findValueByKey("thumbs.loader")));
}
/** 
* @type {PreferenceUpdateCallback}
* @param {boolean} value
* @param {HTMLImageElement[]} thumbs
*/
async function applyTweakLoadingIndicator(value, thumbs = null) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;

    // Dependencies chec
    let dependValue = context.configManager.findValueByKey("thumbs.enlargeOnHover") && context.configManager.findValueByKey("thumbs.highRes") && value;

    utils.debugLog(`Applying LoadingIndicator state: ${String(dependValue)}`);

    if (!thumbs) thumbs = utils.getThumbnails();
    thumbs.forEach((i) => {
        if (dependValue) {
            i.addEventListener("mouseenter", addLoadingIndicator);
        } else {
            i.removeEventListener("mouseenter", addLoadingIndicator);
        }
    });
}
/** 
* @type {PreferenceUpdateCallback}
* @param {boolean} value
*/
async function applyTweakPreventOffScreen(value) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;

    // Dependencies check
    let dependValue = context.configManager.findValueByKey("thumbs.enlargeOnHover") && value;

    utils.debugLog(`Applying PreventOffScreen state: ${String(dependValue)}`);

    utils.getThumbnails().forEach((i) => {
        if (dependValue) {
            i.parentElement.addEventListener("mouseenter", updateTransformOrigin);
        } else {
            i.parentElement.removeEventListener("mouseenter", updateTransformOrigin);
            i.parentElement.style.transformOrigin = "";
        }
    });
}
/** 
* @type {PreferenceUpdateCallback}
* @param {boolean} value
* @param {HTMLImageElement[]} thumbs
*/
async function applyTweakRoundCorners(value, thumbs = null) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;

    utils.debugLog(`Applying RoundCorners state: ${String(value)}`);

    if (!thumbs) thumbs = utils.getThumbnails();
    thumbs.forEach((i) => {
        i.classList.toggle("go-thumbnail-corners", value);
    });
}
/** 
* @type {PreferenceUpdateCallback}
* @param {boolean} value
* @param {HTMLImageElement[]} thumbs
*/
async function applyTweakRemoveTitle(value, thumbs = null) {
    if (utils.pageTypes.GALLERY != context.pageType) return;

    utils.debugLog(`Applying RemoveTitle state: ${String(value)}`);

    if (!thumbs) thumbs = utils.getThumbnails();
    thumbs.forEach((i) => {
        if (value) {
            i.setAttribute("data-title", i.getAttribute("title"));
            i.removeAttribute("title");
        } else {
            if (i.hasAttribute("data-title")) {
                i.setAttribute("title", i.getAttribute("data-title"));
                i.removeAttribute("data-title");
            }
        }
    });
}
/** 
* @type {PreferenceUpdateCallback}
* @param {boolean} value
* @param {HTMLImageElement[]} thumbs
*/
async function applyTweakResizeThumbsGallery(value, thumbs = null) {
    if (utils.pageTypes.GALLERY != context.pageType) return;

    utils.debugLog(`Applying ResizeThumbGallery state: ${String(value)}`);

    if (!thumbs) thumbs = utils.getThumbnails();
    thumbs.forEach((i) => {
        i.classList.toggle("go-thumbnail-resize", value);
        i.parentElement.parentElement.classList.toggle("go-thumbnail-resize", value); // img < a < (article) < div.thumbnail-container
    });
}
/** 
* @type {PreferenceUpdateCallback}
* @param {boolean} value
*/
async function applyTweakResizeThumbsMoreLikeThis(value) {
    if (utils.pageTypes.POST != context.pageType) return;

    utils.debugLog(`Applying ResizeThumbMoreLikeThis state: ${String(value)}`);

    utils.getThumbnails().forEach((i) => {
        i.classList.toggle("go-thumbnail-resize", value);
    });
}
//      FastDL
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value
 * @param {HTMLImageElement[]} thumbs
 */
async function applyTweakFastDL(value, thumbs = null) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;

    utils.debugLog(`Applying FastDL state: ${String(value)}`);

    if (!thumbs) thumbs = utils.getThumbnails();
    thumbs.forEach((i) => {
        if (value) {
            i.addEventListener("contextmenu", downloadThumbWithRMB);
        } else {
            i.removeEventListener("contextmenu", downloadThumbWithRMB);
        }
    });
}
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value
 */
async function applyTweakFastDLPost(value) {
    if (context.pageType != utils.pageTypes.POST) return;

    utils.debugLog(`Applying FastDLPost state: ${String(value)}`);

    let post = document.querySelector("#gelcomVideoPlayer, #image");
    if (value) {
        post.addEventListener("contextmenu", downloadPostWithRMB);
    } else {
        post.removeEventListener("contextmenu", downloadPostWithRMB);
    }
}
//      Infinite Scroll
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value
 */
async function applyTweakInfiniteScroll(value) {
    if (context.pageType != utils.pageTypes.GALLERY) return;

    utils.debugLog(`Applying InfiniteScroll state: ${String(value)}`);

    context.infiniteScrolling.setup(value);
}
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value
 */
async function applyTweakPaginatorOnTop(value) {
    if (context.pageType != utils.pageTypes.GALLERY) return;

    utils.debugLog(`Applying InfiniteScroll state: ${String(value)}`);

    if (value) {
        if (document.querySelector(".top-pagination")) return;

        /** @type {HTMLElement} */
        let topPagination = document.querySelector(".pagination").cloneNode(true);
        topPagination.classList.add("top-pagination");
        document.querySelector("main").insertBefore(topPagination, document.querySelector(".thumbnail-container"));
    } else {
        document.querySelector(".top-pagination").remove();
    }
}
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value
 */
async function applyTweakGoToTop(value) {
    if (context.pageType != utils.pageTypes.GALLERY) return;

    utils.debugLog(`Applying InfiniteScroll state: ${String(value)}`);

    if (value) {
        let goTopDiv = document.createElement("div");
        let goTopSvg = document.createElement("svg");

        goTopDiv.className = "alert alert-info";
        goTopDiv.id = "go-top";
        goTopDiv.addEventListener("click", () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        goTopSvg.innerHTML = 
        '<svg height="1em" width="1em" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg"'+
        'xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 492.002 492.002" xml:space="preserve">'+
        '<g id="SVGRepo_bgCarrier" stroke-width="0"></g>'+
        '<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>'+
        '<g id="SVGRepo_iconCarrier"> '+
        '<g> <g> <path d="M484.136,328.473L264.988,109.329c-5.064-5.064-11.816-7.844-19.172-7.844c-7.208,'+
        '0-13.964,2.78-19.02,7.844 L7.852,328.265C2.788,333.333,0,340.089,0,347.297c0,7.208,2.784,13.968,'+
        '7.852,19.032l16.124,16.124 c5.064,5.064,11.824,7.86,19.032,7.86s13.964-2.796,19.032-7.86l183.852'+
        '-183.852l184.056,184.064 c5.064,5.06,11.82,7.852,19.032,7.852c7.208,0,13.96-2.792,19.028-7.852l16'+
        '.128-16.132 C494.624,356.041,494.624,338.965,484.136,328.473z"></path> </g> </g> </g></svg>';

        goTopDiv.appendChild(goTopSvg);
        document.body.appendChild(goTopDiv);
    } else {
        document.querySelector("#go-top").remove();
    }
}
//      Advanced Blacklist
/**
 * @type {PreferenceUpdateCallback}
 * @param {boolean} value
 */
async function applyTweakAdvancedBlacklist(value) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;
    utils.debugLog(`Applying AdvancedBlacklist state: ${String(value)}`);

    context.blacklistManager.setupManager(value);
}
function applyVariableBlacklist(value) {
    if (![utils.pageTypes.GALLERY, utils.pageTypes.POST].includes(context.pageType)) return;
    context.blacklistManager.orderEntriesByHitCount = value;
    context.blacklistManager.updateSidebarEntries();
}
//      Tweak
/**
 * @param {MouseEvent} e
 */
async function setImageHighResSource(e) {
    /** @type {HTMLImageElement} */
    let img = e.target;
    utils.loadPostItem(Number(/id=([0-9]+)/.exec(img.parentElement.getAttribute("href"))[1]))
        .then((post) => img.src = post.highResThumb)
        .catch((error) => utils.debugLog("Failed to load highres image for following element with following error:", { img, error }));

}
/**
 * @param {MouseEvent} e
 */
async function setImageLowResSource(e) {
    /** @type {HTMLImageElement} */
    let img = e.target;
    if (img.complete)
        img.src = img.getAttribute("data-thumb-src");
    else
        img.addEventListener("load", () => img.src = img.getAttribute("data-thumb-src"), { once: true });

}
function autoScroll() {
    /** @type {HTMLImageElement} */
    let image = document.querySelector("#image");

    if (image) {
        // only if image fit window
        utils.debugLog(`Height is ${window.innerHeight} vs ${image.height}`);
        utils.debugLog(`Width  is ${window.innerWidth} vs ${image.width}`);

        if (window.innerHeight > image.height && window.innerWidth > image.width) {
            utils.debugLog("Scrolling");
            image.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
            history.scrollRestoration = 'manual';
        } else {
            history.scrollRestoration = 'auto';
        }
    }
    // not works for video
}
function toggleFitMode() {
    utils.debugLog("Toggling fit mode");

    let noteContainer = document.querySelector(".note-container");
    noteContainer.classList.toggle("go-fit-height");
    noteContainer.classList.toggle("go-fit-width");

    /** @type {HTMLImageElement} */
    let image = noteContainer.querySelector("#image");
    image.classList.toggle("go-fit-height");
    image.classList.toggle("go-fit-width");

    image.style.width = "";
    image.style.height = "";
    image.removeAttribute("width");
    image.removeAttribute("height");

    /** @type {HTMLDivElement} */
    let resizeLink = document.querySelector("#resize-link");
    resizeLink.style.display = "";
}
/**
 * @param {MouseEvent} e
 */
function updateTransformOrigin(e) {
    /** @type {HTMLElement} */
    let elem = e.target;
    let rect = elem.getBoundingClientRect();
    let xOrigin = rect.x + (rect.width / 2);

    if (xOrigin - (rect.width * Number(context.configManager.findValueByKey("thumbs.scale")) / 2) <= window.innerWidth * 0.01) {
        elem.style.transformOrigin = 'left';
    } else if (xOrigin + (rect.width * Number(context.configManager.findValueByKey("thumbs.scale")) / 2) >= window.innerWidth * 0.99) {
        elem.style.transformOrigin = 'right';
    } else {
        elem.style.transformOrigin = '';
    }
}
/**
 * @param {MouseEvent} e
 */
function addLoadingIndicator(e) {
    e.target.parentElement.classList.add("go-loader");
    e.target.addEventListener("load", ee => {
        ee.target.parentElement.classList.remove("go-loader");
    }, { once: true });
}
/**
 * FastDL contextmenu event listener
 * @param {MouseEvent} e
 */
function downloadThumbWithRMB(e) {
    if (e.shiftKey) {
        return;
    }

    e.preventDefault();

    utils.downloadPostById(utils.getThumbPostId(e.target));
}
/**
 * FastDL contextmenu event listener
 * @param {MouseEvent} e
 */
function downloadPostWithRMB(e) {
    if (e.shiftKey) {
        return;
    }

    e.preventDefault();

    let postId = Number(/id=([0-9]+)/.exec(document.location.href)[1]);
    utils.downloadPostById(postId);
}
/**
 * 
 * @param {MouseEvent} e 
 */
function toggleFitModeWithCursors(e) {
    /** @type {HTMLAnchorElement} */
    let resizeLink = document.querySelector("#resize-link > a");
    resizeLink.click();

    e.target.classList.toggle("go-cursor-zoom-in");
    e.target.classList.toggle("go-cursor-zoom-out");
}
