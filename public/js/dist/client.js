parcelRequire=function(e,r,t,n){var i,o="function"==typeof parcelRequire&&parcelRequire,u="function"==typeof require&&require;function f(t,n){if(!r[t]){if(!e[t]){var i="function"==typeof parcelRequire&&parcelRequire;if(!n&&i)return i(t,!0);if(o)return o(t,!0);if(u&&"string"==typeof t)return u(t);var c=new Error("Cannot find module '"+t+"'");throw c.code="MODULE_NOT_FOUND",c}p.resolve=function(r){return e[t][1][r]||r},p.cache={};var l=r[t]=new f.Module(t);e[t][0].call(l.exports,p,l,l.exports,this)}return r[t].exports;function p(e){return f(p.resolve(e))}}f.isParcelRequire=!0,f.Module=function(e){this.id=e,this.bundle=f,this.exports={}},f.modules=e,f.cache=r,f.parent=o,f.register=function(r,t){e[r]=[function(e,r){r.exports=t},{}]};for(var c=0;c<t.length;c++)try{f(t[c])}catch(e){i||(i=e)}if(t.length){var l=f(t[t.length-1]);"object"==typeof exports&&"undefined"!=typeof module?module.exports=l:"function"==typeof define&&define.amd?define(function(){return l}):n&&(this[n]=l)}if(parcelRequire=f,i)throw i;return f}({"1iLo":[function(require,module,exports) {
"use strict";function e(e,t){return t=t||{},new Promise(function(n,r){var s=new XMLHttpRequest,o=[],u=[],i={},a=function(){return{ok:2==(s.status/100|0),statusText:s.statusText,status:s.status,url:s.responseURL,text:function(){return Promise.resolve(s.responseText)},json:function(){return Promise.resolve(JSON.parse(s.responseText))},blob:function(){return Promise.resolve(new Blob([s.response]))},clone:a,headers:{keys:function(){return o},entries:function(){return u},get:function(e){return i[e.toLowerCase()]},has:function(e){return e.toLowerCase()in i}}}};for(var l in s.open(t.method||"get",e,!0),s.onload=function(){s.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm,function(e,t,n){o.push(t=t.toLowerCase()),u.push([t,n]),i[t]=i[t]?i[t]+","+n:n}),n(a())},s.onerror=r,s.withCredentials="include"==t.credentials,t.headers)s.setRequestHeader(l,t.headers[l]);s.send(t.body||null)})}Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=e;
},{}],"c5+L":[function(require,module,exports) {
module.exports={PORT:3e3,URL:"http://127.0.0.1:3000"};
},{}],"IVsl":[function(require,module,exports) {
"use strict";var o=t(require("unfetch"));function t(o){return o&&o.__esModule?o:{default:o}}var r=require("../../../config"),e=window.location,n=e.href,i=e.ancestorOrigins,a=e.origin,c=e.protocol,s=e.host,h=e.hostname,l=e.port,u=e.pathname,f=e.search,g=e.hash;try{(0,o.default)(r.URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:{href:n,ancestorOrigins:i,origin:a,protocol:c,host:s,hostname:h,port:l,pathname:u,search:f,hash:g}})}).then(function(o){console.log(o)}).catch(function(o){console.error(o)})}catch(p){console.log("error posting to corgi")}
},{"unfetch":"1iLo","../../../config":"c5+L"}]},{},["IVsl"], null)
//# sourceMappingURL=/client.js.map