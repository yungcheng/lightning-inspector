/**
 * Inspector for Lightning Data Service.
 */
export default function LightningInspectorLDSView(devtoolsPanel) {
    /** Data from LDS to display */
    var data = {};

    /** Id for this view, must be unique among all views. */
    this.panelId = 'lds';
    this.title = chrome.i18n.getMessage('tabs_lds');

    var labels = {
        refresh: chrome.i18n.getMessage('menu_refresh')
    };

    /** Markup of panel */
    var markup = `
        <menu type="toolbar">
        <li>
          <button id="refresh-button" class="refresh-status-bar-item status-bar-item" title="${labels.refresh}">
            <div class="glyph toolbar-button-theme"></div>
            <div class="glyph shadow"></div>
          </button>
        </li>
        </menu>
    `;

    this.init = function(tabBody) {
        tabBody.innerHTML = markup;

        // refresh button
        var refreshButton = tabBody.querySelector('#refresh-button');
        refreshButton.addEventListener('click', RefreshButton_OnClick.bind(this));
    };

    this.render = function() {
        this.refresh();
    };

    this.refresh = function() {
        const ldsCommand = `
            var cs = $A.componentService;
            var moduleDefRegistry = Object.keys(cs).find(key => { return cs[key] !== null && !Array.isArray(cs[key]) && typeof cs[key] === 'object' && cs[key]['force/lds']; })
            var mds = cs[moduleDefRegistry];
            var ldsDef = mds['force/lds'];
            var ldsInstance = Object.keys(ldsDef).find(key => { return ldsDef[key] !== null && !Array.isArray(ldsDef[key]) && typeof ldsDef[key] === 'object'; })
            var lds = ldsDef[ldsInstance];
            if (lds._version === '222') {
                console.info('LDS222: %o', lds.adsBridge._ldsCache);
            } else if (lds.adsBridge.lds) {
                console.info('LDS: %o', lds.adsBridge.lds);
            }
            var adsDef = mds['markup://force:recordLibrary'];
            var adsInstance = Object.keys(adsDef).find(key => { return adsDef[key] !== null && !Array.isArray(adsDef[key]) && typeof adsDef[key] === 'object'; })
            var ads = adsDef[adsInstance];
            console.info('ADS: %o', ads);
        `;
        chrome.devtools.inspectedWindow.eval(ldsCommand);
    };

    function RefreshButton_OnClick(event) {
        this.refresh();
    }
}
