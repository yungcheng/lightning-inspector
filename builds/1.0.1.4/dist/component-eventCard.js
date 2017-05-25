!function(a){function b(d){if(c[d])return c[d].exports;var e=c[d]={exports:{},id:d,loaded:!1};return a[d].call(e.exports,e,e.exports,b),e.loaded=!0,e.exports}var c={};b.m=a,b.c=c,b.p="",b(0)}({0:function(a,b,c){a.exports=c(11)},11:function(a,b){"use strict";!function(){function a(a){var b,f=c(a.getAttribute("handledByTree"))||[],g=a.shadowRoot.querySelector("#callStack");if(g.removeChildren(),!f||0===f.length)return void g.appendChild(function(){var a,b;return a=document.createElement("td"),a.appendChild(document.createTextNode(chrome.i18n.getMessage("eventcard_none"))),b=document.createElement("tr"),b.appendChild(a),b}());b=d(a,f),g.appendChild(function(){var a,b;return a=document.createElement("tr"),b=document.createElement("th"),b.appendChild(document.createTextNode(chrome.i18n.getMessage("eventcard_event"))),a.appendChild(b),b=document.createElement("th"),b.appendChild(document.createTextNode(chrome.i18n.getMessage("eventcard_actions"))),a.appendChild(b),a}());for(var h=b.length-1;h>=0;h--){var i,j=b[h];i=document.createElement("tr"),i.appendChild(function(a){var b,c,d,f=a[0];return f.data.sourceId&&(d=document.createElement("aurainspector-auracomponent"),d.setAttribute("summarize",!0),d.setAttribute("globalId",f.data.sourceId)),c=document.createElement("td"),b=document.createElement("a"),b.textContent=(f.data.sourceId,f.data.name),b.href="",b.setAttribute("data-globalid",f.id),b.setAttribute("data-controller-name",f.data.name),b.addEventListener("click",e),c.appendChild(b),d&&c.appendChild(d),c}(j)),i.appendChild(function(a){for(var b,c,d=document.createElement("td"),e=1;e<a.length;e++){var f=a[e];c=document.createElement("aurainspector-auracomponent"),c.setAttribute("summarize",!0),c.setAttribute("globalId",f.data.scope),b=document.createElement("aurainspector-controllerreference"),b.setAttribute("expression","{!c."+f.data.name+"}"),b.setAttribute("component",f.data.scope),b.textContent="c."+f.data.name,e>1&&d.appendChild(document.createElement("br")),d.appendChild(b),d.appendChild(c)}return d}(j)),g.appendChild(i)}}function b(a){var b=c(a.getAttribute("handledByTree"))||[];if(!(b.length<2)){var d=a.shadowRoot.querySelector("#eventHandledByGrid");d.removeChildren(),d.classList.remove("hidden");for(var e=a.id,f=[],g=[],h=0;h<b.length;h++){var i,j=b[h];if("action"===j.type)i={id:j.id,label:"{"+j.data.scope+"} c."+j.data.name,color:"maroon"};else{var k=j.data.sourceId?"{"+j.data.sourceId+"} "+j.data.name:j.data.name;i={id:j.id,label:k,color:"steelblue"},j.id===e&&(i.size=60,i.color="#333")}g.push(i),j.parent&&f.push({from:j.id,to:j.parent,arrows:"from"})}var l=new vis.DataSet(g),m=new vis.DataSet(f),n={nodes:{borderWidth:1,shape:"box",size:50,font:{color:"#fff"},color:{border:"#222"}},layout:{hierarchical:{enabled:!0,direction:"DU",sortMethod:"directed"}},interaction:{dragNodes:!0}};new vis.Network(d,{nodes:l,edges:m},n).on("doubleClick",function(b){if(b.nodes.length){var c=b.nodes[0];c.startsWith("event_")&&a.dispatchEvent(new CustomEvent("navigateToEvent",{detail:{eventId:c}}))}}.bind(this))}}function c(a){return a?0===a.length?a:"string"==typeof a?JSON.parse(a):a:a}function d(a,b){for(var c=a.id,d=[],e=[];null!=c;)for(var f=0;f<b.length;f++){var h=b[f];h.id===c&&("event"===h.type?d.push([h]):e.push(h),c=h.parent?h.parent:null)}for(var f=0;f<b.length;f++)b[f].parent&&b[f].parent===a.id&&"action"===b[f].type&&e.push(b[f]);for(var i=0;i<e.length;i++)for(var h=e[i],f=0;f<d.length;f++){var j=d[f][g];h.parent===j.id&&d[f].push(h)}return d}function e(a){this.dispatchEvent(new CustomEvent("navigateToEvent",{detail:{eventId:a.path[0].dataset.globalid}})),a.preventDefault()}function f(a){var b=this.getAttribute("showGrid");this.setAttribute("showGrid",b&&"true"===b?"false":"true")}var g=0,h=document.currentScript.ownerDocument,i=Object.create(HTMLElement.prototype);i.attachedCallback=function(){var a={eventName:this.getAttribute("name"),eventSourceId:this.getAttribute("sourceId"),eventDuration:this.getAttribute("duration"),eventType:"APPLICATION"===this.getAttribute("type")?"APP":"CMP",eventCaller:this.getAttribute("caller"),parameters:this.getAttribute("parameters")};a.eventName.startsWith("markup://")&&(a.eventName=a.eventName.substr(9)),this.shadowRoot.querySelector("h1").textContent=a.eventName,this.shadowRoot.querySelector("h6").textContent=a.eventType,this.shadowRoot.querySelector(".caller").textContent=a.eventCaller,this.shadowRoot.querySelector("#eventDuration").textContent=a.eventDuration+"ms",this.shadowRoot.querySelector(".parameters").textContent=a.parameters;var b=this.getAttribute("collapsed");if("true"===b||"collapsed"===b){this.shadowRoot.querySelector("section").classList.add("hidden")}var c=this.shadowRoot.querySelector("#eventSource");if(a.eventSourceId){var d=document.createElement("aurainspector-auracomponent");d.setAttribute("globalId",a.eventSourceId),c.appendChild(d)}else c.classList.add("hidden");"aura:valueChange"===a.eventName&&(this.shadowRoot.querySelector("h2").textContent="{! "+JSON.parse(a.parameters).expression+" }")},i.createdCallback=function(){var a=h.querySelector("template"),b=document.importNode(a.content,!0),c=this.createShadowRoot();c.appendChild(b),c.querySelector("#gridToggle").addEventListener("click",f.bind(this)),this.shadowRoot.querySelector("section").addEventListener("transitionend",function(a){a.target.classList.remove("highlight")})},i.attributeChangedCallback=function(c,d,e){if("collapsed"===c){var f=this.shadowRoot.querySelector("section"),g=this.isCollapsed();"true"===e||"collapsed"===e&&!g?f.classList.add("hidden"):"true"!==e&&"collapsed"!==e&&g&&(f.classList.remove("hidden"),a(this),"true"===this.getAttribute("showGrid")&&b(this))}"showgrid"!==c&&"showGrid"!==c||("true"===e?b(this):this.shadowRoot.querySelector("#eventHandledByGrid").classList.add("hidden"))},i.isCollapsed=function(){return this.shadowRoot.querySelector("section").classList.contains("hidden")},i.highlight=function(){this.shadowRoot.querySelector("section").classList.add("highlight")};document.registerElement("aurainspector-eventCard",{prototype:i})}()}});