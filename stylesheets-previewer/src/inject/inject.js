import "./inject.scss";

console.log("content.js loaded", window == top ? "@ top" : "in frame @", window.location.href);
if (window == top) {
    console.log("is VF page?", Boolean(window.document.querySelector('.apexp')));
}

const SELECTOR_CSS_PROCESSED = "css__processed";
const SELECTOR_CSS_DEACTIVATED = "css__deactivated";
const SELECTOR_CSS_SLDS4VF = "slds-vf-stylesheet";
const SELECTOR_CSS_LINK = "html link[rel='stylesheet']";
const SELECTOR_STYLE_TAG = "style";
const URL_TEMPLATE = "stylesheets-previewer/src/template/template.html";
const WRAPPER_ID = "sfdc-lightning-stylesheets-extension-view";
const CATEGORY_CLASSIC = 'salesforce';
const CATEGORY_LIGHTNING = 'lex4vf';
const CATEGORY_SLDS = 'slds';
const LINKS_INLINE_STYLES = "styleTag";
const LINKS_CUSTOM_STYLES = "custom";

let port;
let currentStylesheets = [];
let currentStyleTags = [];

const model = (() => {
    const data = [];
    const getById = id => data.find(link => link.id === id);
    const createElementData = (element, url, filename, category) => ({
        id: element.id,
        activated: !element.classList.contains(SELECTOR_CSS_DEACTIVATED),
        url,
        filename,
        category
    });
    let templates;
    const isPageReady = false;

    document.addEventListener("domcontentready", () => { isPageReady = true; });

    return {
        isPageReady: function() {
            return isPageReady || document.readyState === "complete";
        },
        add: cssLinkData => {
            if (getById(cssLinkData.id)) {
                console.warn(cssLinkData.id, "is already processed", cssLinkData);
            } else {
                data.push(cssLinkData)
            }
        },
        categoryHeaderContent: {
            [CATEGORY_LIGHTNING]: {
                title: 'Lightning Stylesheets for Visualforce',
                description: '',
            },
            [CATEGORY_SLDS]: {
                title: '&lt;apex:slds&gt;',
                description: 'Lightning Design System styles brought in by usage of &lt;apex:slds&gt;',
            },
            [CATEGORY_CLASSIC]: {
                title: 'Salesforce styles',
                description: 'Styles that the platform normally uses in Visualforce pages',
            },
            [LINKS_INLINE_STYLES]: {
                title: 'Style tags',
                description: 'Styles that exist in &lt;style&gt; blocks',
            },
            [LINKS_CUSTOM_STYLES]: {
                title: 'Custom styles',
                description: 'Your custom styles or ones that could not be otherwise identified',
            }
        },
        setActivation: (cssLinkId, value) => {
            const idx = data.findIndex(element => element.id == cssLinkId);
            data[idx].activated = value;
        },
        getById: getById,
        getCategoryById: id => data.find(element => element.id == id).category,
        getCategoryByUrl: url => {
            if (RegExp('lightningstylesheets').test(url)) return CATEGORY_LIGHTNING;
            if (RegExp('^\/apexpages\/slds\/|^\/slds\/css\/').test(url)) return CATEGORY_SLDS;
            if (RegExp('^\/sCSS\/|^\/faces\/').test(url)) return CATEGORY_CLASSIC;
            return 'custom';
        },
        getCssLinkData: cssLink => {
            const href = cssLink.getAttribute("href");
            return createElementData(
                cssLink,
                href,
                href.split(/\.css|\.xcss/).shift().split('/').pop(),
                model.getCategoryByUrl(href)
            )
        },
        getStyleTagData: styleTag => {
            return createElementData(
                styleTag,
                styleTag.textContent.trim().substring(0, 144),
                "&lt;STYLE tag&gt;",
                "styleTag"
            )
        },

        isLightningStylesheetsActive: function () { 
            return Boolean(data.find(link => link.category === "lex4vf" && link.activated === true));
        }, 

        get hasVisualforceClasses() {
            try {
                return !!window.document.querySelector('.apexp, .bPageBlock, .ext-chrome, .sfdcBody');
            } catch(e) {}
            return false;
        },

        get hasPageContent() {
            try {
                // test for empty page
                return !!window.document.body.innerHTML.trim().length;
            } catch(e){}
            return false;
        },

        get isVisualforceFrame() {
            return RegExp(/vfFrameId_\d+/).test(window.name); // ||
            // RegExp(/^\/apex\/|\.apexp/).test(window.location.pathname); // test for frame with Visualforce page
        },

        get isValidVisualforcePage() {
            return this.hasPageContent &&
            ((window != top && this.isVisualforceFrame) ||
                (window == top && this.hasVisualforceClasses));
        },

        themePicklistValues: [{
                category: CATEGORY_LIGHTNING,
                item_value: "Lightning Stylesheets"
            },
            {
                category: CATEGORY_CLASSIC,
                item_value: "Classic Stylesheets"
            },
            {
                category: 'none',
                item_value: "No Stylesheets"
            }
        ],
        themeSelected: CATEGORY_CLASSIC,
        toString: () => JSON.stringify(data),
        get data() {
            return data
        },
        get orgLightningStylesheetsCssPath() {
            return `/slds/css/${(new Date()).getTime()}/min/lightningstylesheets/one:oneNamespace,force:sldsTokens,force:base,force:oneSalesforceSkin,force:levelTwoDensity,force:themeTokens,force:formFactorLarge/slds.css`
        },
        get templates() {
            return templates
        },
        set templates(newTemplates) {
            templates = newTemplates
        }
    }
})();

/**
* supplant() does variable substitution on the string. It scans through the string looking for 
* expressions enclosed in {{}} braces. If an expression is found, use it as a key on the object, 
* and if the key has a string value or number value, it is substituted for the bracket expression 
* and it repeats.
*
* Written by Douglas Crockford
* http://www.crockford.com/
*/
const supplant = function (string, values) {
    return string.replace(
        /{{([^{}]*)}}/g, 
        function (a, b) {
            var r = values[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
}


class Template {
    _templateHtml = '';
    /**
     * The id='' from the template.html file.
     */
    constructor(templateId) {
        if (!model.templates) {
            throw new Error('No templates defined. Call await fetchTemplates() before creating any Template objects.');
        }

        if (!model.templates.hasOwnProperty(templateId)) {
            throw new Error(`No template of id '${tempalteId}' defined. Check template.html to ensure you have the correct id.`);
        }

        this._templateHtml = model.templates[templateId];
    }

    renderTo(target, model) {
        const fragment = this.render(model);
        target.appendChild(fragment);
    }

    /**
     * Convert the contents of the template to HTML.
     * Returns a DocumentFragment
     * @param {Map} model Key value pairs. Any patterns of {{value}} in the HTML will be replaced with the value in the model.
     */
    render(model = {}) {
        const mergedHtml = supplant(this._templateHtml, model);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = mergedHtml;

        const fragment = document.createDocumentFragment();
        for (var child of tempDiv.childNodes) {
            fragment.appendChild(child);
        }

        return fragment;
    }
}

const togglePanel = (force) => document.getElementById(WRAPPER_ID).classList.toggle('is-open', force);

const getLinks = category => model.data.filter(item => item.category == category);

const renderTemplate = (snippet, container) => {
    const wrapper = container || document.createElement("div");
    wrapper.innerHTML = snippet;
    return container ? wrapper : wrapper.firstElementChild;
}

const hydrateTemplate = (snippet, data) => {
    Object.keys(data).forEach(key => {
        snippet = snippet.replace(RegExp(`{{${key}}}`, 'g'), data[key])
    })
    return snippet;
}

const renderLinkSection = (category) => {
    const returnFragment = document.createDocumentFragment();
    const { categoryHeaderContent } = model;
    const {
        description,
        activated,
        title
    } = categoryHeaderContent[category];
    
    // Items to show in the link section
    const linksList = getLinks(category);

    // No links, return a blank fragment
    if (linksList.length === 0) {
        return returnFragment;
    }

    const listHeaderTemplate = new Template('list_header');
    listHeaderTemplate.renderTo(returnFragment, {
        category,
        title,
        description,
        is_checked: model.data
            .filter(item => item.category == category)
            .every(item => item.activated === false) ? '' : 'checked',
    });

    // Render the List Container
    const listBodyTemplate = new Template('list_body');
    listBodyTemplate.renderTo(returnFragment);

    const listBodyElement = returnFragment.querySelector(".extension-view-list-body");
    
    // Get all the links for the current category and for each one
    // append to the list container
    const linkItemTemplate = new Template('list_item');
    linksList.map(link => linkItemTemplate.renderTo(listBodyElement, Object.assign(link, {
        is_checked: link.activated ? 'checked' : ''
    })));

    return returnFragment;
}

const render = async () => {
    await fetchTemplates();
    const {
        categoryHeaderContent,
        templates,
        themePicklistValues,
        themeSelected
    } = model;

    // If we haven't injected the wrapper yet, inject it.
    if (!document.getElementById(WRAPPER_ID)) {
        document.body.insertAdjacentHTML('beforeend', `<div id="${WRAPPER_ID}"></div>`);
    } else {
        document.getElementById(WRAPPER_ID).innerHTML = '';
    }

    const containerElement = document.getElementById(WRAPPER_ID);
    const containerTemplate = new Template('container');
    containerTemplate.renderTo(containerElement);

    const extensionViewContainerElement = containerElement.querySelector(".extension-view-container");
    const contentTemplate = new Template('content');
    contentTemplate.renderTo(extensionViewContainerElement);
    
    const extensionViewContentElement = containerElement.querySelector(".extension-view-content");
    const headerTemplate = new Template('header');
    const bodyTemplate = new Template('body');
    headerTemplate.renderTo(extensionViewContentElement);
    bodyTemplate.renderTo(extensionViewContentElement);
    
    const sldsLinks = renderLinkSection(CATEGORY_SLDS);
    const customLinks = renderLinkSection(LINKS_CUSTOM_STYLES);
    const styleTags = renderLinkSection(LINKS_INLINE_STYLES);

    const themePicklistTemplate = new Template('theme_picklist');
    const themePicklist = themePicklistTemplate.render({
        selected_value: themePicklistValues.find(option => option.category == themeSelected).item_value
    });

    const themesDropdown = themePicklist.querySelector("#listbox-themes ul");
    const themePicklistOptionTemplate = new Template('theme_picklist_option');
    
    themePicklistValues.map(option =>
        themePicklistOptionTemplate.renderTo(themesDropdown,             
            Object.assign({}, option, {
                is_selected: themeSelected == option.category ? 'slds-is-selected' : '',
                partial_icon_check: templates.icon_check,
                partial_selected_a11y_label: templates.list_item_partial_selected_a11y_label
            }))
    );

    const dropdownContainer = containerElement.querySelector(".extension-view-dropdown");
    dropdownContainer.appendChild(themePicklist);

    const extensionViewCustomStyles = containerElement.querySelector(".extension-view-custom-styles");
    extensionViewCustomStyles.appendChild(sldsLinks);
    extensionViewCustomStyles.appendChild(customLinks);
    extensionViewCustomStyles.appendChild(styleTags);
}

const applyLightningStylesheetsCss = (contentWindow) => {
    const contentDoc = contentWindow.document;
    if (!contentDoc.querySelector(`.${SELECTOR_CSS_SLDS4VF}`)) {
        model.themeSelected = CATEGORY_LIGHTNING;
        // Array.from(contentDoc.querySelectorAll(`${SELECTOR_CSS_LINK}, ${SELECTOR_STYLE_TAG}`))
        //   .map(cssElement => {
        //     deactivateCSSElement(cssElement);
        // 	});

        const css = contentDoc.createElement("link");
        css.rel = "stylesheet";
        // When testing local SLDS4VF
        // css.href = "https://localhost:4443/styles/extension.css";
        // css.href="https://drive.google.com/a/salesforce.com/uc?authuser=0&id=0B2Qc3WrvwamZY3lvRmNJMWZaeUk&export=download";
        // css.href="https://design-system-visualforce.herokuapp.com/styles/extension.css?token=51828b28843be76b5715105e5a715003";
        // css.href = "http://lex4vf-dev.surge.sh/styles/production.css";
        css.href = model.orgLightningStylesheetsCssPath;
        css.type = "text/css";
        css.id = SELECTOR_CSS_SLDS4VF;
        css.classList.add(SELECTOR_CSS_SLDS4VF);
        contentDoc.head.appendChild(css);
        chrome.runtime.sendMessage({
            msg: "lightningStylesheetsActivated",
            value: true
        });
        handleCategorySelection(CATEGORY_LIGHTNING);
    }
}

const handleCategoryStateFromChildClick = category => {
    const categoryElements = model.data.filter(item => item.category == category);
    const categoryCheckbox = document.getElementById(`checkbox_${category}`);
    if (categoryElements.every(item => item.activated === true)) {
        //turn on category check
        categoryCheckbox.checked = true;
        categoryCheckbox.indeterminate = false;
    } else if (categoryElements.every(item => item.activated === false)) {
        //turn off category check
        categoryCheckbox.checked = false;
        categoryCheckbox.indeterminate = false;
    } else {
        //turn on mixed
        categoryCheckbox.indeterminate = true;
    }
};

const deactivateCSSElement = element => {
    element.setAttribute("media", "max-width: 1px");
    element.classList.add(SELECTOR_CSS_DEACTIVATED);
    model.setActivation(element.id, false);
    console.log("Deactivating:", element.dataset.initCssUrl);
    return element;
}

const activateCSSElement = element => {
    element.removeAttribute('media');
    element.classList.remove(SELECTOR_CSS_DEACTIVATED);
    model.setActivation(element.id, true);
    console.log("Activating:", element.dataset.initCssUrl);
    return element;
}

const createRandomId = () => `${(new Date()).getTime()}-${Math.random()*10**17}`;

const getPageStyleSheets = () => {
    const stylesheetsQuery = document.querySelectorAll(SELECTOR_CSS_LINK);
    if (stylesheetsQuery.length) {
        const prevStylesheets = currentStylesheets.concat([]);
        currentStylesheets = Array.from(stylesheetsQuery);
        currentStylesheets
            .filter(cssLink => !cssLink.classList.contains(SELECTOR_CSS_PROCESSED))
            .map(cssLink => processCssLinks(cssLink));
        if (currentStylesheets.length != prevStylesheets.length) {
            console.log("CSS Found:", document.querySelectorAll(SELECTOR_CSS_LINK));
            render();
        };
    }
}

/**
 * Returns the style tags on the page that are not filtered out 
 * and have not been handled by the extension already.
 */
const getPageStyleTags = () => {
    const styleTagsQuery = Array.from(document.querySelectorAll(SELECTOR_STYLE_TAG));
    if (styleTagsQuery.length) {
        const prevStyleTags = currentStyleTags.concat([]);
        currentStyleTags = Array.from(styleTagsQuery);
        const toProcessStyleTags = currentStyleTags
            .filter(styleTag => {
                const isExtensionCss = styleTag.textContent.includes('sfdc-lightning-stylesheets-extension-view');
                const hasBeenProcessByExtension = !styleTag.classList.contains(SELECTOR_CSS_PROCESSED);
                return isExtensionCss && hasBeenProcessByExtension;
            })
            .map((styleTag) => {
                styleTag.id = createRandomId();
                styleTag.classList.add(SELECTOR_CSS_PROCESSED);
                return styleTag;
            });

        return toProcessStyleTags;
        // if (currentStyleTags.length != prevStyleTags.length) {
        //     console.log("Style Tag Found:", document.querySelectorAll(SELECTOR_STYLE_TAG));
        //     render();
        // };
    }
}

const handleCategorySelection = category => {
    const elementDataSet = model.data.filter(elementData => [CATEGORY_CLASSIC, CATEGORY_LIGHTNING].includes(elementData.category));
    if (category == CATEGORY_LIGHTNING &&
        !elementDataSet.find(elementData => elementData.category == CATEGORY_LIGHTNING))
        applyLightningStylesheetsCss(window);

    elementDataSet.map(elementData => (
        toggleCSSElement(
            document.getElementById(elementData.id),
            elementData.category == category
        )
    ));
    render();
}

const handlePickListSelect = (listItem) => {
    const category = listItem.dataset.category;
    model.themeSelected = category;
    handleCategorySelection(category);
}

const processCssLinks = cssLink => {
    console.log("Processing:", cssLink.getAttribute('href')); //cssLink
    const href = cssLink.getAttribute('href');
    cssLink.id = createRandomId();
    cssLink.dataset.initCssUrl = cssLink.getAttribute('href');
    cssLink.classList.add(SELECTOR_CSS_PROCESSED);
    model.add(model.getCssLinkData(cssLink));
    return cssLink;
}

const processStyleTags = styleTag => {
    // Skip the inject.css file for this extension
    if(styleTag.textContent.includes('sfdc-lightning-stylesheets-extension-view')) {
        return;
    }
    console.log("Processing:", styleTag.innerHTML.trim().substring(0, 24) + "…"); //styleTag
    styleTag.id = createRandomId();
    styleTag.classList.add(SELECTOR_CSS_PROCESSED);
    model.add(model.getStyleTagData(styleTag));
    return styleTag;
}

const fetchTemplates = () => {
    return fetch(chrome.runtime.getURL(URL_TEMPLATE))
        .then(response => response.text())
        .then(response => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = response;

            const $templates = wrapper.querySelectorAll("template");
            const templates = {};

            Array.from($templates).forEach(function (template) {
                templates[template.id] = template.innerHTML.trim();
            });

            model.templates = templates;
            return templates;
        })
}

const toggleCSSElement = (element, isChecked) => (
    element ?
    isChecked ?
    activateCSSElement(element) :
    deactivateCSSElement(element) :
    console.warn("Unable to find the CSS link element to de/activate")
)

chrome.extension.sendMessage({}, function (response) {
    var readyStateCheckInterval = setInterval(function () {
        
        if (model.isPageReady()) {
            clearInterval(readyStateCheckInterval);

            // ----------------------------------------------------------
            // This part of the script triggers when page is done loading
            console.log("readyState", window.location.href);
            // ----------------------------------------------------------

            try {
                let confirmLoadCSS = null;
                const { hasVisualforceClasses, hasPageContent, isVisualforceFrame, isValidVisualforcePage } = model;

                document.body.addEventListener("change", e => {
                    const clickedElement = event.target;
                    // const toggle = (checkbox, value) => {
                    //     if (value) {
                    //         if (checkbox.checked !== value) checkbox.click();
                    //     } else {
                    //         checkbox.click();
                    //     }
                    //     return checkbox;
                    // }

                    if (clickedElement.classList.contains("category-check")) {
                        model.data
                            .filter(elementData => elementData.category == clickedElement.dataset.cssCategory)
                            .map(elementData => (
                                toggleCSSElement(
                                    document.getElementById(elementData.id),
                                    clickedElement.checked
                                )
                            ));
                        render();
                    }

                    if (clickedElement.classList.contains("list-item-check")) {
                        toggleCSSElement(
                            document.getElementById(clickedElement.dataset.cssNodeId),
                            clickedElement.checked
                        )
                        handleCategoryStateFromChildClick(clickedElement.dataset.cssCategory);
                    }
                })

                document.body.addEventListener("click", e => {
                    if (e.target.classList.contains("button-panel-close")) togglePanel();
                    if (e.target.classList.contains("button-apply-lss")) applyLightningStylesheetsCss(window);
                })

                document.body.addEventListener("mousedown", e => {
                    const target = e.target.classList.contains("slds-listbox__option") ? e.target : e.target.closest(".slds-listbox__option");
                    if (target) {
                        handlePickListSelect(target);
                    }
                })

                window.addEventListener("focusin", e => {
                    if (e.target.id == "combobox-theme-select") {
                        document.querySelector(".slds-combobox").classList.add("slds-is-open");
                    }
                })

                window.addEventListener("focusout", e => {
                    if (e.target.id == "combobox-theme-select") {
                        document.querySelector(".slds-combobox").classList.remove("slds-is-open");
                    }
                })

                chrome.runtime.sendMessage({
                    msg: "pageActionState",
                    value: isValidVisualforcePage
                });

                if (isValidVisualforcePage) {
                    fetchTemplates().then(() => {
                        console.log("Initializing on:", window.location.pathname);
                        const pollCSSLoaded = setInterval(getPageStyleSheets, 3000);
                        const styleTagsToProcess = getPageStyleTags();
                        model.addStyleTags(styleTagsToProcess);
                        
                        getPageStyleSheets();

                        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                            console.log(sender.tab ?
                                "from a content script:" + sender.tab.url :
                                "from the extension");
                            switch (request.msg) {
                                case "activateSlds4Vf":
                                    applyLightningStylesheetsCss(window);
                                    return sendResponse({
                                        msg: request.msg,
                                        complete: true
                                    });
                                case "openPanel":
                                    return togglePanel(true);
                                case "isLightningStylesheetsActive":
                                    return sendResponse({
                                        msg: request.msg,
                                        value: model.isLightningStylesheetsActive()
                                    });
                                case "isPanelOpen":
                                    return sendResponse({
                                        msg: request.msg,
                                        value: document.getElementById(WRAPPER_ID).classList.contains("is-open")
                                    });
                                default:
                                    return {
                                        msg: `No Extension Message Handler for ${request}`
                                    }
                            }
                        });
                    })
                }
            } catch (e) {
                console.error(e);

                // Interacting with the page threw an exception. 
                // Lets just bail.
                return;
            }
            // togglePanel(true);
        }
    }, 10);
});