# Gelbooru Overhaul Userscript
Various toggleable changes to Gelbooru such as enlarging the gallery, removing the sidebar, and more.

![example a](https://enchoseon.com/assets/enhanced-demo.gif)

# [Convenient Install Link](https://github.com/Enchoseon/gelbooru-overhaul-userscript/raw/main/gelbooru-overhaul.user.js)

Be sure to have a [userscript manager](https://en.wikipedia.org/wiki/Userscript_manager) installed in your web browser first. Note that the `Right Click Download` feature uses GM_download which; AFAIK, is a [Tampermonkey](https://www.tampermonkey.net/)-only feature.

# Features
|    General   |      Post      |             Gallery            |
|:------------:|:--------------:|:------------------------------:|
| Amoled       | Fit Vertically | Remove Title                   |
| Sexy Sidebar |                | Enlarge Flexbox                |
|              |                | Advanced Blacklist             |
|              |                | Right Click Download           |
|              |                | Enlarge Thumbnails on Hover    |
|              |                | Higher Res Thumbnails on Hover |


# Jankiness
The userscript is pretty stable, until you resize the viewport—so just don't; or, disable some settings, namely: `Enlarge Flexbox` & `Enlarge Thumbnails on Hover`.

# Feature Brainstorm
Some wishful thinking.

- Infinite Scroll
- Theming
  - Material Design
- Advanced Blacklisting
  - ~~AND Logic Operators~~
  - Blocking Based on Tag Type (e.g. `tag=type-artist`)
  - Multiple Toggleable Blacklists
  - Display But Flag Suspicious Images (e.g. `tag_me`)
- More Right-Click Context Menu Settings
  - Rev-Image Search in Imgops, SauceNao, IQDB, etc.
  - Migrate Sidebar Settings (namely: `Options`, `History`, & `Related Posts`) Here
- Apply Gallery Tweaks to `More Like This` Area
