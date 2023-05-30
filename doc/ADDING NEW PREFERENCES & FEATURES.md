# ADDING NEW PREFERENCES

1. Open `resources/gelbooru-overhaul.configManager.js`
2. Find `getDefaultConfig()`
- `getDefaultConfig()` returns the following config object:

```js
{string: PreferenceCatgory}
```

- where `string` is Key
- where `PreferenceCategory` is:

```js
 /**
  * @typedef  PreferenceCategory 
  * @type     {Object}
  * @property {string}                          name     Displayed name in config window
  * @property {Object.<string, PreferenceItem>} items    Children preference items
  * /
{
    name: string,
    items: {string, PreferenceItem}
}
```

- where `items.string` is Key
- where `PreferenceItem` is:

```js
 /**
  * @typedef  PreferenceItem
  * @type     {Object}
  * @property {number | string | boolean} value          Value of preference
  * @property {string}                    name           Displayed name in config window
  * @property {string}                    description    Description displayed in config window
  * @property {boolean}                   [locked=false] Determines if preference should be available for editing
  * /
{
    name: string
    description: string
    locked: boolean
    number | string | boolean: value
}
```
3. Add new category if needed
4. Add new item

The keys can be any string, but I prefer to keep the category structure
`Category1.Item1`, `Category1.Item2`, `Category2.Item1`

Preference value can be accessed using:

```js
configManager.findValueByKey(key: string)
```

# ADDING NEW FEATURES

1. Open `gelbooru-overhaul.user.js`
2. Find `main()`
3. Add new line:

```js
configManager.addUpdateListener(key: string, listener);
```

- where listener is:

```js
function(value: number | string | boolean)
```

—Which will be caused by the change of preference value and on page load.

If your setting is only used as a value in another function, there is no need to track its change.

The listeners should be arranged so that any of your preference tweak can be turned off and the page can be restored to its original appearance.

You also may want to check `currentPageType` from `utils.pageTypes`

If you want your preference to...:
- ...set css variables, see `applyCssVariableGoCollapseSidebar()` for an example of how to do it.
- ...has dependent preferences, see `applyTweakEnlargeOnHover()` for an example of how to do it.

You can access a page's thumbnails with `utils.getThumbnails()` which returns `HTMLImageElement[]` (posts for Gallery page, 'More Like This' for Post page)

Config window automatically display your new preference, but there is no validation yet.

Note that values updates live

For thumbnail tweaks on Gallery page there is also `infiniteScrolling.addUpdateListener(listener)`.

- Where `listener` is:

```js
function(value: number | string | boolean, thumbs: HTMLImageElement[])
```

- Should be applied only for new thumb

Script starts on DOM ready so there is no need to check this
