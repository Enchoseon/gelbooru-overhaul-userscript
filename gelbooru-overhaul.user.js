// ==UserScript==
// @name         Gelbooru Overhaul
// @namespace    https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/gelbooru-overhaul.user.js
// @version      0.6.9
// @description  Various toggleable changes to Gelbooru such as enlarging the gallery, removing the sidebar, and more.
// @author       Enchoseon
// @include      *gelbooru.com*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_download
// ==/UserScript==

(function() {
  "use strict";
  // =============
  // Configuration
  // =============
  const cfg = {
    gen: { // GENERAL
      amoled: true, // A very lazy Amoled theme
      sexySidebar: true, // Move the leftmost sidebar to the top-left of the screen next to the Gelbooru logo
    },
    post: { // POST
      fitVertically: true, // Scale media to fit vertically in the screen
    },
    gall: { // GALLERY
      removeTitle: true, // Removes the title attribute from thumbnails
      rightClickDownload: true, // Makes it so that when you right-click thumbnails you'll download their highest-resolution counterpart
            rightClickDownloadSaveAsPrompt: true, // Show the "Save As" File Explorer prompt when right-click downloading
      enlargeFlexbox: true, // Make the thumbnails in the gallery slightly larger & reduce the number of columns
      enlargeThumbnailsOnHover: true, // Make the thumbnails in the gallery increase in scale when you hover over them (best paired with gallery.higherResThumbnailsOnHover)
      higherResThumbnailsOnHover: true, // Make the thumbnails in the gallery higher-resolution when you hover over them
    },
  };
  var css = "";
  // =======================================================
  // Higher-Resolution Preview When Hovering Over Thumbnails
  //        Download Images in Gallery on Right-Click
  //               Remove Title from Thumbnails
  // =======================================================
  if (cfg.gall.higherResThumbnailsOnHover || cfg.gall.rightClickDownload || cfg.gall.removeTitle) {
      document.addEventListener("DOMContentLoaded", function () {
          Object.values(document.querySelectorAll(".thumbnail-preview")).forEach((elem) => {
              var aElem = elem.querySelector("a");
              var imgElem = aElem.querySelector("img");
              if (cfg.gall.higherResThumbnailsOnHover) { // Higher-Resolution Preview When Hovering Over Thumbnails
                  imgElem.addEventListener("mouseenter", function() {
                      convertThumbnail(imgElem, aElem, false);
                  }, false);
              }
              if (cfg.gall.rightClickDownload) { // Download Images in Gallery on Right-Click
                  imgElem.addEventListener("contextmenu", (event) => {
                      event.preventDefault();
                      convertThumbnail(imgElem, aElem, true).then(function() { // Make sure that the highest-resolution version available is downloaded
                          downloadImage(imgElem, aElem);
                      });
                  })
              }
              if (cfg.gall.removeTitle) { // Remove Title from Thumbnails
                  imgElem.title = "";
              }
          });
      });
  }
  // =================================
  // Make Leftmost Sidebar Collapsable
  // =================================
  if (cfg.gen.sexySidebar && window.location.search !== "") {
      document.addEventListener("DOMContentLoaded", function () {
          var div = document.createElement('div');
          div.id = "sidebar";
          div.innerHTML = document.querySelectorAll(".aside")[0].innerHTML;
          document.body.appendChild(div);
      });
      css += `
          .aside {
              grid-area: aside;
              display: none;
          }
          #container {
              grid-template-columns: 0px auto;
          }
          #sidebar {
              position: absolute;
              width: 10px;
              height: 0.13em;
              padding-top: 60px;
              overflow: hidden;
              background: red;
              top: 0;
              left: 0;
              transition: 142ms;
              z-index: 420690;
          }
          #sidebar:hover {
              position: fixed;
              width: 240px;
              height: 100%;
              padding-top: 0px;
              overflow-y: scroll;
              background: black;
              opacity: 0.9;
          }
      `;
  }
  // =============================
  // Scale Media To Fit Vertically
  // =============================
  if (cfg.post.fitVertically) {
      css += `
          #image, #gelcomVideoPlayer {
              height: 75vh !important;
              width: auto !important;
          }
      `;
  }
  // ===========================
  // Enlarge Thumbnails On Hover
  // ===========================
  if (cfg.gall.enlargeThumbnailsOnHover) {
      css += `
          .thumbnail-preview a img {
              transform: scale(1);
              transition: transform 169ms;
          }
          .thumbnail-preview a img:hover {
              transform: scale(2.42);
              transition-delay: 142ms;
          }
          .thumbnail-preview:hover {
              position: relative;
              z-index: 690;
          }
      `;
  }
  // =======================
  // Enlarge Gallery Flexbox
  // =======================
  if (cfg.gall.enlargeFlexbox) {
      css += `
          .thumbnail-preview {
              height: 21em;
              width: 20%;
          }
          .thumbnail-preview {
              transform: scale(1.42);
          }
          html, body {
              overflow-x: hidden;
          }
          .searchArea {
              z-index: 420;
          }
          #paginator {
              margin-top: 6.9em;
          }
          main {
              margin-top: 1.21em;
          }
      `;
  }
  // ===========================
  // Extremely Lazy Amoled Theme
  // ===========================
  if (cfg.gen.amoled) {
      css += `
          body, #tags-search {
              color: white;
          }
          .note-body {
              color: black !important;
          }
          .aside, .searchList, header, .navSubmenu, #sidebar {
              filter: saturate(42%);
          }
          .thumbnail-preview a img {
              border-radius: 0.42em;
          }
          #container, header, .navSubmenu, body, .alert-info, footer, html, #tags-search {
              background-color: black !important;
              background: black !important;
          }
          .searchArea a, .commentBody, textarea, .ui-menu {
              filter: invert(1) saturate(42%);
          }
          .aside, .alert-info, #tags-search {
              border: unset;
          }
      `;
  }
  // ==========
  // Inject CSS
  // ==========
  (function() {
      var s = document.createElement("style");
      s.setAttribute("type", "text/css");
      s.appendChild(document.createTextNode(css));
      document.querySelector("head").appendChild(s);
  })();
  // ================
  // Utility Functions
  // ================
  // Get higher-resolution counterpart of a thumbnail
  function convertThumbnail(imgElem, aElem, highestQuality) {
      return new Promise(function(resolve, reject) {
          var gelDB = GM_getValue("gelDB", {});
          var index = hash(aElem.href);
          if (!gelDB[index] || (highestQuality && !gelDB[index].high) || (!gelDB[index].medium)) { // Request higher-resolution image (unless it's already indexed)
              var xobj = new XMLHttpRequest();
              xobj.open("GET", aElem.href, true);
              xobj.onreadystatechange = function() {
                  if (xobj.readyState == 4 && xobj.status == "200") {
                      const responseDocument = new DOMParser().parseFromString(xobj.responseText, "text/html");
                      if (responseDocument.querySelector("#gelcomVideoPlayer")) { // Reject videos
                          reject("Gelbooru Overhaul doesn't support videos in convertThumbnail() or downloadImage() yet.");
                          if (highestQuality) {
                              alert("Gelbooru Overhaul doesn't support videos in convertThumbnail() or downloadImage() yet.");
                          }
                          return;
                      }
                      gelDB[index] = {};
                      gelDB[index].tags = convertTagElem(responseDocument.querySelector("#tag-list")); // Grab tags
                      gelDB[index].medium = responseDocument.querySelector("#image").src; // Get medium-quality src
                      gelDB[index].high = responseDocument.querySelectorAll("script:not([src])"); // Get highest-quality src
                      gelDB[index].high = gelDB[index].high[gelDB[index].high.length - 1]
                                                      .innerHTML
                                                      .split(`image.attr('src','`)[1]
                                                      .split(`');`)[0];
                      GM_setValue("gelDB", gelDB);
                      output();
                  }
              };
              xobj.send(null);
          } else { // Skip the AJAX voodoo if it's already indexed. Added bonus of cache speed.
              output();
          }
          function output() {
              if (highestQuality) {
                  imgElem.src = gelDB[index].high;
              } else {
                  imgElem.src = gelDB[index].medium;
              }
              resolve();
          }
      });
  }
  // Convert tag list elem into a friendlier object
  function convertTagElem(tagElem) {
      var tagObj = {
          "artist": [],
          "character": [],
          "copyright": [],
          "metadata": [],
          "general": [],
          "deprecated": [],
      };
      Object.values(tagElem.querySelectorAll("li")).forEach((tag) => {
          if (tag.className.startsWith("tag-type-")) {
              var type = tag.className.replace("tag-type-", "");
              tag = tag.querySelector("span a")
                       .href
                       .replace("https://gelbooru.com/index.php?page=wiki&s=list&search=", "");
              tagObj[type].push(tag);
          }
      });
      return tagObj;
  }
  // Generate hash from string (https://stackoverflow.com/a/7616484)
  function hash(str) {
      var hash = 0, i, char;
      if (str.length === 0) return hash;
      for (i = 0; i < str.length; i++) {
          char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash);
  };
  // Download image
  function downloadImage(imgElem, aElem) {
      var gelDB = GM_getValue("gelDB", {});
      var index = hash(aElem.href);
      var extension = imgElem.src.split(".").at(-1);
      GM_download({
          url: imgElem.src,
          name: formatFilename(gelDB[index].tags.artist.join(" "), index, extension),
          saveAs: cfg.gall.rightClickDownloadSaveAsPrompt,
      })
  }
  // Create the filename from the artist's name
  function formatFilename(artist, index, extension) {
      if (artist === "") {
          artist = "_unknown-artist";
      }
      return artist.replace(/[^a-z0-9]/gi, '_') // Make filename-safe (https://stackoverflow.com/a/8485137)
                   .replace(/_{2,}/g, '_') // and remove consecutive underscores
                   .toLowerCase() + "_" + index + "." + extension;
  }
})();
