/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/background.js":
/*!***************************!*\
  !*** ./src/background.js ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const backgroundPage = new AuraInspectorBackgroundPage();
backgroundPage.init();

function AuraInspectorBackgroundPage() {
    // Chrome Tabs
    const tabs = new Map();
    // Dev Tool Panels to send messages to
    //var ports = new Map();
    // Messages we are queuing up till the dev tools panel is launched.
    //var stored = new Map();
    // External Plugins connecting to the Aura Inspector
    const external = new Map();

    // Pub / Sub in the background script.
    const _subscribers = new Map();

    var labels;
    // List of inspectors we want to pair with.
    const EXTERNAL_INSPECTOR_EXTENSION_IDS = {
        "hmoenmfdbkbjcpiibpfakppdpahlfnpo": true, // Dev Sfdc Inspector,
        "mmhofgmpfhjnekcfjelmdkjogjildhji": true // Chrome Webstore Sfdc Inspector
    };

    const BACKGROUND_KEY = "BackgroundPage:publish";

    this.init = function () {
        labels = {
            "devtoolsNotif": chrome.i18n.getMessage("open_devtools_notif")
        };

        chrome.runtime.onConnect.addListener(BackgroundPage_OnConnect.bind(this));
        chrome.runtime.onConnectExternal.addListener(BackgroundPage_OnConnectExternal.bind(this));
        chrome.runtime.onMessageExternal.addListener(BackgroundPage_OnMessageExternal.bind(this));

        // Consider tying this into the injected set, so we add the context to injected tabs.
        // Might just need to change the documentUrlPatterns in that case.
        chrome.contextMenus.create({
            title: "Inspect Lightning Component",
            contexts: ["all"],
            onclick: BackgroundPage_OnContextClick.bind(this)

            // Commented out the filter since most pages don't have .app in them anymore. 
            // Consider moving this into onConnect, and using the href of the page as the documentUrlPattern
            // ,documentUrlPatterns: ["*://*/*cmp*", "*://*/*app*"]
        });

        // Add the external panels to the tabInfo collection.
        this.subscribe("BackgroundPage:OnExternalMapToConnection", BackgroundPage_OnExternalMapToConnection.bind(this));
        this.subscribe("BackgroundPage:OpenTab", BackgroundPage_OnOpenTab.bind(this));
        this.subscribe("BackgroundPage:InjectContentScript", BackgroundPage_OnInjectContentScript.bind(this));
    };

    /**
     * Broadcast a message to JUST the background page.
     *
     * @param  {String} key MessageID to broadcast.
     * @param  {Object} data any type of data to pass to the subscribe method.
     */
    this.publish = function (key, data) {
        if (!key) {
            return;
        }

        callBackgroundPageSubscribers(key, [data]);
    };

    /**
     * Listen for a published message from JUST THE BACKGROUND PAGE.
     *
     * @param  {String} key Unique MessageId that would be broadcast through the system.
     * @param  {Function} callback function to be executed when the message is published.
     */
    this.subscribe = function (key, callback) {
        if (!_subscribers.has(key)) {
            _subscribers.set(key, []);
        }

        _subscribers.get(key).push(callback);
    };

    function BackgroundPage_OnExternalMapToConnection(tabId, sender) {
        const externalPort = external.get(sender.frameId);
        if (externalPort) {
            // This is the first one
            if (TabInfo.count() === 0) {
                chrome.tabs.onUpdated.addListener(BackgroundPage_OnTabUpdated);
            }

            const tabInfo = TabInfo.create(tabId);
            tabInfo.addPanel(externalPort);
            external.delete(sender.frameId);

            externalPort.tabId = tabId;
        }
    }

    function BackgroundPage_OnOpenTab(url, sender) {
        chrome.tabs.create({ "url": url });
    }

    function BackgroundPage_OnInjectContentScript(tabId, sender) {
        chrome.tabs.executeScript(tabId, { file: "dist/contentScript.js" });
    }

    function BackgroundPage_OnConnect(port) {
        // It is possible for some reason to not have a tab object from devToolPanels connecting.
        var tabId = getTabId(port);

        if (tabId !== -1) {

            // This is the first one
            if (TabInfo.count() === 0) {
                chrome.tabs.onUpdated.addListener(BackgroundPage_OnTabUpdated);
            }

            // Content script (Chrome Tab)
            TabInfo.create(tabId);
            port.onDisconnect.addListener(ContentScript_OnDisconnect.bind(this));
        } else {
            port.onDisconnect.addListener(DevTools_OnDisconnect.bind(this));
        }

        port.onMessage.addListener(BackgroundPage_OnMessage.bind(this));
    }

    // Nothing really to do that I can think of.
    function ContentScript_OnDisconnect(port) {}

    function DevTools_OnDisconnect(port) {
        if (!port.name) {
            return; // Not sure why this would happen.
        }

        //var tab = port.sender.tab;

        // Delete the stored port on the tab
        var tabInfo = TabInfo.get(port.tabId);
        if (tabInfo) {
            tabInfo.removePanel(port);

            // Happens in removePanel now, if all the panels are cleared, it resets the subscriptions.
            //tabInfo.subscriptions.clear();

            // Don't just build up a bunch of messages for tabs that have been unloaded
            if (!tabInfo.hasPanels()) {
                // Chrome Tab
                TabInfo.delete(port.tabId);

                if (TabInfo.count() === 0) {
                    chrome.tabs.onUpdated.removeListener(BackgroundPage_OnTabUpdated);
                }
            }
        }
    }

    function BackgroundPage_OnContextClick(event, tab) {
        var tabInfo = TabInfo.get(tab.id);

        var devToolsIsOpen = tabInfo && !!tabInfo.hasPanels();

        passMessageToDevTools({
            action: "AuraInspector:publish",
            key: "AuraInspector:OnContextMenu"
        }, tab.id);

        if (!devToolsIsOpen) {
            alert(labels.devtoolsNotif);
        }
    }

    function BackgroundPage_OnMessage(message, port) {
        // Should move to this.subscribe
        if (message.subscribe) {
            var tabId = message.tabId;
            var tabInfo = TabInfo.get(tabId);

            // Tab doesn't exist.
            // Can happen when you launch dev tools on dev tools.
            if (!tabInfo) {
                if (TabInfo.count() === 0) {
                    chrome.tabs.onUpdated.addListener(BackgroundPage_OnTabUpdated);
                }

                tabInfo = TabInfo.create(tabId);
            }

            tabInfo.addPanel(port);
            port.tabId = tabId;

            for (var i = 0; i < message.subscribe.length; i++) {
                var type = message.subscribe[i];
                var sub = tabInfo.hasSubscription(type);
                if (!sub) {
                    tabInfo.addSubscription(type);
                }
            }

            tabInfo.queueFilter(function (message) {
                if (tabInfo.hasSubscription(message.action)) {
                    passMessageToDevTools(message, tabId);
                    return false;
                }
                return true;
            });
        }if (message.action === BACKGROUND_KEY) {
            callBackgroundPageSubscribers(message.key, [message.data, port.sender]);
        } else {
            var tabId = getTabId(port);
            if (tabId !== -1) {
                passMessageToDevTools(message, tabId);
            } else {
                console.warn("unknown action or tabId", message, tabId);
            }
        }
    }

    /**
    *   get release version of the app from server
    *   @param serverUrl url of server we are running chaos run against, like https://mobile1.t.salesforce.com/sfdc/releaseVersion.jsp
    */
    function getAppVersion(serverUrl) {
        return new Promise((resolve, reject) => {
            var versionUrl = "";
            versionUrl = serverUrl.substring(serverUrl.indexOf("lightning.") + "lightning.".length, serverUrl.indexOf("com") + "com".length);
            versionUrl = "https://" + versionUrl + "/sfdc/releaseVersion.jsp";
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var idx = this.responseText.indexOf("AuraJarVersion");
                    if (idx >= 0) {
                        resolve(this.responseText.substr(idx, 21));
                    } else {
                        reject("no AuraJarVersion in response");
                    }
                }
            };
            xhttp.open("GET", versionUrl, true);
            xhttp.send();
        });
    };

    function BackgroundPage_OnMessageExternal(message, sender) {

        var tabId = message.tabId;
        delete message.tabId;

        // Communicate directly to the background script.
        if (message.action === BACKGROUND_KEY) {
            callBackgroundPageSubscribers(message.key, [message.data, sender]);
        } else {
            passMessageToDevTools(message, tabId);
        }
    }

    function BackgroundPage_OnConnectExternal(port) {
        var id = port.sender.id;
        var frameId = port.sender.frameId;

        // Possibly a bit paranoid since they shouldn't be able to connect if we don't have their ID in the manifest
        // But lets just be extra sure who we are communicating with.
        if (EXTERNAL_INSPECTOR_EXTENSION_IDS[id]) {
            external.set(frameId, port);
            port.onDisconnect.addListener(DevTools_OnDisconnect.bind(this));
        }
    }

    function BackgroundPage_OnTabUpdated(tabId, changeInfo, tab) {
        // Only happens when we've attached to this tab before.
        const tabInfo = TabInfo.get(tabId);
        if (changeInfo.status === "loading" && tabInfo && tabInfo.hasPanels()) {
            chrome.tabs.executeScript(tabId, { file: "dist/contentScript.js", "runAt": "document_start" });
        }
    }

    function passMessageToDevTools(message, tabId) {
        var tabInfo = TabInfo.get(tabId);

        // Should only happen when devtools are closed, and we don't care about this case.
        if (!tabInfo) {
            return;
        }

        //var subscriptions = tabInfo.subscriptions.has(message.action);
        if (tabInfo.hasSubscription(message.action)) {
            tabInfo.sendMessage(message);
        } else {
            // Probably haven't subscribed to this yet, wait till we subscribe to the action then repeat it.
            tabInfo.queueMessage(message);
        }

        // Send messages to other Inspector plugins connected to the Aura Inspector
        // TODO: Won't work currently
        // message.tabId = tabId;
        // external.forEach(function(externalPort, key) {
        //     chrome.runtime.sendMessage(key, message);
        // });
    }

    function callBackgroundPageSubscribers(key, data) {
        if (_subscribers.has(key)) {
            _subscribers.get(key).forEach(function (callback) {
                try {
                    callback.apply(null, data);
                } catch (e) {
                    console.error(e);
                }
            });
        }
    }

    function getTabId(port) {
        return port && port.sender && port.sender.tab ? port.sender.tab.id : -1;
    }

    function TabInfo(tabId) {
        const _subscriptions = new Set();
        const _panels = new Map();
        var _queue = [];
        var MAX_QUEUE_LENGTH = 100000;

        // TODO: Should the external ports go in here?
        this.addPanel = function (port) {
            if (!port.name) {
                return;
            }
            _panels.set(port.name, port);
        };

        this.removePanel = function (port) {
            _panels.delete(port.name);

            if (!this.hasPanels()) {
                _subscriptions.clear();
            }
        };

        this.hasPanels = function () {
            return !!_panels.size;
        };

        // Sends a message to all the subscribed panels.
        this.sendMessage = function (message) {
            _panels.forEach(function (panel, panelName, map) {
                //console.log("TabInfo:SendMessage", message.key, message.data);

                if (panel.sender && panel.sender.id !== chrome.runtime.id && EXTERNAL_INSPECTOR_EXTENSION_IDS[panel.sender.id]) {
                    message.tabId = tabId;
                    chrome.runtime.sendMessage(panel.sender.id, message);
                    delete message.tabId;
                } else {
                    panel.postMessage(message);
                }
            });
        };

        this.queueMessage = function (message) {
            _queue.push(message);

            if (_queue.length > MAX_QUEUE_LENGTH) {
                _queue.shift();
            }
        };

        this.addSubscription = function (subscribeKey) {
            _subscriptions.add(subscribeKey);

            // TODO: Consider checking the queueMessage collection to see if it has anything
            // and then pass those to sendMessage
        };

        this.hasSubscription = function (subscribeKey) {
            return _subscriptions.has(subscribeKey);
        };

        this.queueFilter = function (predicate) {
            _queue = _queue.filter(predicate);
        };
    }

    TabInfo.create = function (tabId) {
        var tabInfo = tabs.get(tabId);

        if (!tabInfo) {
            tabInfo = new TabInfo(tabId);
            tabs.set(tabId, tabInfo);
        }
        return tabInfo;
    };

    TabInfo.get = function (tabId) {
        return tabs.get(tabId);
    };

    TabInfo.delete = function (tabId) {
        tabs.delete(tabId);
    };

    TabInfo.count = function () {
        return tabs.size;
    };
}

/***/ }),

/***/ 1:
/*!*********************************!*\
  !*** multi ./src/background.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./src/background.js */"./src/background.js");


/***/ })

/******/ });
//# sourceMappingURL=background.js.map