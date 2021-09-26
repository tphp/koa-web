'use strict';

const fs = require("fs");
const mime = require("mime-types");
const handle = require("./handle");
const appStatic = require('./app-static');
const tool = require('./tool');

/**
 * 路由处理
 */
class Route {
  static path;
  static view;
  static nunjucks;
  static render;
  static isRender = false;
  static maxAge = 0;
  static json = {};

  // 动态加载JS文件
  static requires = {};

  // 动态加载JSON文件
  static jsons = {};

  // 动态加载模板文件
  static htmls = {};

  // 错误页面
  static errors = {};

  // 扩展页面配置
  static extTypes = {};

  // 扩展页面调用
  static extCalls = {};

  // 扩展页面中间件或数据设置
  static extFunctions = {

    // 中间件
    mid: {},

    // 数据设置
    data: {}
  };

  // 域名转向
  static viewDomains = {};

  // 默认转向
  static viewDomainDefault = "";

  /**
   * 格式化目录
   * @param {*} str 
   * @returns 
   */
  static dirTrim(str) {
    let arr = str.replace(/[\\]/g, "/").split("/");
    let newArr = [];
    for (const i in arr) {
      let iv = arr[i];
      if (!['', '.', '..'].includes(iv)) {
        newArr.push(iv);
      }
    }

    return newArr.join("/");
  }

  /**
   * 判断是否时文件
   * @param {*} filePath 
   * @returns 
   */
  static isFile(filePath) {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  }

  /**
   * 获取浏览器地址栏目录路径
   * @param {*} url 
   * @returns 
   */
  static getUrlDir(url) {
    let pos = url.indexOf("?");
    if (pos > 0) {
      url = url.substring(0, pos);
    }
    url = url.substring(1);
    while (url[url.length - 1] === '/') {
      url = url.substring(0, url.length - 1);
    }

    pos = url.lastIndexOf("/");

    let lastUrl = "";
    let dir = "";
    if (pos > 0) {
      lastUrl = url.substring(pos + 1);
      dir = url.substring(0, pos + 1);
    } else {
      lastUrl = url;
    }

    pos = lastUrl.lastIndexOf(".");
    let ext = "";
    if (pos > 0) {
      ext = lastUrl.substring(pos + 1).toLocaleLowerCase();
      lastUrl = lastUrl.substring(0, pos);
      if (ext === 'htm' || ext === 'html') {
        ext = "";
      }
    }

    let urlPath = dir + lastUrl;
    return [ext.toLocaleLowerCase(), urlPath.replace(/\s/g, "")];
  }

  /**
   * 加载 favicon.ico 文件
   * @param {*} ctx 
   * @returns 
   */
  static async setFavicon(ctx) {
    let sPath = this.getSubPath(ctx);
    if (sPath !== '') {
      sPath = "/" + sPath;
    }
    let faviconFile = "/" + this.view.path + sPath + "/favicon.ico";
    let filePath = this.path + faviconFile;
    if (!this.isFile(filePath)) {
      return {
        status: true,
        body: "favicon.ico from: " + faviconFile,
        type: undefined
      };
    }

    let statSync = fs.statSync(filePath);
    if (statSync.isFile()) {
      let file = fs.readFileSync(filePath);
      let mimeType = mime.lookup(filePath);
      return {
        status: true,
        body: file,
        type: mimeType
      };
    } else {
      return {
        status: true,
        body: "Is Not Files",
        type: undefined
      };
    }
  }

  /**
   * 动态加载源码文件
   * @param {*} path 
   * @param {*} cache 
   * @param {*} ext 
   * @param {*} ctx 
   * @param {*} func 
   * @returns 
   */
  static getFileInfo(path, cache, ext = '', ctx, func = () => {}) {
    let fileInfo;
    if (ext === this.view.ext) {
      fileInfo = this.htmls;
    } else {
      fileInfo = this.requires;
    }

    if (path[0] === '@') {
      path = path.substring(1);
    } else {
      let sPath = this.getSubPath(ctx);
      if (sPath !== '') {
        path = sPath + "/" + path;
      }
    }

    let oReq = fileInfo[path];
    if (cache && oReq !== undefined) {
      return oReq;
    }

    let realPath = this.path + "/" + this.view.path + "/" + path + ext;
    let isFile = false;
    let statSync;
    if (fs.existsSync(realPath)) {
      statSync = fs.statSync(realPath);
      if (statSync.isFile()) {
        isFile = true;
      }
    }

    if (!isFile) {
      if (oReq !== undefined && oReq.isFile === false) {
        return oReq;
      }

      fileInfo[path] = {
        isFile: false
      };

      return fileInfo[path];
    }

    if (oReq !== undefined && oReq.mTime === statSync.mtimeMs + "") {
      return oReq;
    }

    return func(fileInfo, path, realPath, statSync);
  }

  /**
   * 动态加载JS文件
   * @param {*} path 
   * @param {*} cache 
   * @param {*} ctx 
   * @returns 
   */
  static getJsInfo(path, cache, ctx) {
    return this.getFileInfo(
      path,
      cache,
      ".js",
      ctx,
      (fileInfo, path, realPath, statSync) => {
        // 删除调用缓存，热加载
        let requireCall;
        let callLower = {};
        let isError = false;
        try {
          delete require.cache[require.resolve(realPath)];
          requireCall = require(realPath);
          if (tool.type(requireCall) === 'Object') {
            for (const i in requireCall) {
              callLower[i.toLocaleLowerCase()] = i;
            }
          }
        } catch (e) {
          requireCall = e.message;
          isError = true;
          console.error(requireCall);
        }

        let nReq = {
          isFile: true,
          mTime: statSync.mtimeMs + "",
          call: requireCall,
          callLower: callLower,
          isError: isError
        };

        fileInfo[path] = nReq;
        return nReq;
      }
    );
  }

  /**
   * 动态加载模板文件
   * @param {*} path 
   * @param {*} cache 
   * @param {*} ctx 
   * @returns 
   */
   static getHtmlInfo(path, cache, ctx) {
    return this.getFileInfo(
      path,
      cache,
      this.view.ext,
      ctx,
      (fileInfo, path, realPath, statSync) => {
        let html;
        let isError = false;
        try {
          html = fs.readFileSync(realPath).toString();
        } catch (e) {
          html = e.message;
          isError = true;
          console.error(html);
        }

        let nReq = {
          isFile: true,
          mTime: statSync.mtimeMs + "",
          html: html,
          isError: isError
        };

        fileInfo[path] = nReq;
        return nReq;
      }
    );
  }

  /**
   * 动态加载JSON文件
   * @param {*} path 
   * @param {*} cache 
   * @param {*} ctx 
   * @returns 
   */
  static getJsonInfo(path, cache, ctx) {
    let oJson = this.jsons[path];
    if (cache && oJson !== undefined) {
      return oJson;
    }

    let sPath = this.getSubPath(ctx);
    if (sPath !== '') {
      path = sPath + "/" + path;
    }

    let realPath = this.path + "/" + this.view.path + "/" + path + ".json";
    let isFile = false;
    let statSync;
    if (fs.existsSync(realPath)) {
      statSync = fs.statSync(realPath);
      if (statSync.isFile()) {
        isFile = true;
      }
    }

    if (!isFile) {
      if (oJson !== undefined && oJson.isFile === false) {
        return oJson;
      }

      this.jsons[path] = {
        isFile: false
      };

      return this.jsons[path];
    }

    if (oJson !== undefined && oJson.mTime === statSync.mtimeMs + "") {
      return oJson;
    }

    // 读取JSON文件
    let jsonData;
    try {
      jsonData = JSON.parse(fs.readFileSync(realPath));
      if (typeof jsonData === 'object') {
        if (jsonData instanceof Array) {
          jsonData = {};
        }
      } else {
        jsonData = {};
      }
    } catch (e) {
      jsonData = {};
    }

    let nJson = {
      isFile: true,
      mTime: statSync.mtimeMs + "",
      json: jsonData
    };

    this.jsons[path] = nJson;
    return nJson;
  }

  /**
   * 处理配置信息
   * @param {*} keyName 
   * @param {*} srcData 
   * @param {*} newData 
   * @returns 
   */
  static getJsonHandle(keyName, srcData, newData) {
    if (!['css', 'js'].includes(keyName)) {
      if (newData === undefined) {
        return srcData;
      }

      return newData;
    }

    let retData = {};
    let dataList = [srcData, newData];
    if (srcData !== undefined) {
      dataList.push(srcData);
    }
    if (newData !== undefined) {
      dataList.push(newData);
    }

    if (dataList.length <= 0) {
      return retData;
    }

    let dList = [];
    for (const i in dataList) {
      let iv = dataList[i];
      if (typeof iv === 'string') {
        iv = iv.trim();
        if (iv !== '') {
          dList.push(iv);
        }
      } else if (iv instanceof Array) {
        for (const j in iv) {
          let jv = iv[j];
          if (typeof jv === 'string') {
            jv = jv.trim();
            if (jv !== '') {
              dList.push(jv);
            }
          }
        }
      }
    }

    for (const i in dList) {
      let iv = dList[i];
      if (iv[0] === '@') {
        retData[iv.substring(1)] = true;
      } else {
        retData[iv] = false;
      }
    }
    return retData;
  }

  /**
   * 获取文件配置信息
   * @param {*} path 
   * @param {*} cache 
   * @param {*} ctx 
   * @returns 
   */
  static getJson(path, cache, ctx) {
    let jsonInfo = Route.getJsonInfo(path, cache, ctx);
    let retJson = JSON.parse(JSON.stringify(this.json));
    if (jsonInfo.isFile) {
      let jInfo = JSON.parse(JSON.stringify(jsonInfo.json));
      for (const i in jInfo) {
        retJson[i] = this.getJsonHandle(i, retJson[i], jInfo[i]);
      }
    }

    // 默认模块、视图设置
    let defaults = ['module', 'view'];
    for (const i in defaults) {
      let iv = defaults[i];
      let rj = retJson[iv];
      if (rj === undefined || typeof rj !== 'string' || rj.trim() === '') {
        retJson[iv] = path;
      }
    }

    let rLayout = retJson.layout;
    if (typeof rLayout === 'string') {
      let rInfo = Route.getJsonInfo(rLayout, cache, ctx);
      if (rInfo.isFile) {
        let rrInfo = JSON.parse(JSON.stringify(rInfo.json));
        for (const i in rrInfo) {
          retJson[i] = this.getJsonHandle(i, rrInfo[i], retJson[i]);
        }
      }
    }

    rLayout = retJson.layout;
    if (typeof rLayout === 'string') {
      retJson.layout = this.dirTrim(rLayout);
    }

    // 清除空格
    let sTrims = ['layout', 'module', 'view'];
    for (const i in sTrims) {
      if (typeof retJson[sTrims[i]] === 'string') {
        retJson[sTrims[i]] = retJson[sTrims[i]].replace(/\s/g, "");
      }
    }

    return retJson;
  }

  /**
   * 错误页面处理
   * @param {*} message 
   * @param {*} code 
   * @param {*} ctx 
   * @param {*} cache 
   * @param {*} isApp 
   * @returns 
   */
  static async getAppError(message, code = 404, ctx, cache, isApp = true) {
    let errPath = this.errors[code];
    ctx.response.status = code;
    let ret = {
      status: false,
      body: message,
      type: undefined
    };

    if (errPath === undefined) {
      errPath = '';
    } else if (typeof errPath !== 'string' || errPath.trim() === "") {
      return ret;
    }

    let isRoot = false;

    errPath = errPath.replace(/\s/g, "");

    if (errPath[0] === '@') {
      isRoot = true;
      errPath = errPath.substring(1);
    }
    
    errPath = this.dirTrim(errPath);
    errPath = errPath.replace(/[\\]/g, "/");
    if (errPath === '') {
      errPath = 'errors/' + code;
    }

    let callBackUrl;
    if (isRoot) {
      callBackUrl = "/@" + errPath;
    } else {
      callBackUrl = "/" + errPath;
    }
    
    let sPath = "";

    if (!isRoot) {
      sPath = this.getSubPath(ctx);
      if (sPath !== '') {
        sPath += "/";
      }
    }

    const errRootPath = Route.path + "/" + Route.view.path + "/" + sPath + errPath;
    if (
      !this.isFile(errRootPath + Route.view.ext) &&
      !this.isFile(errRootPath + ".js") &&
      !this.isFile(errRootPath + ".json")
    ) {
      return ret;
    }

    let {body} = await this.app(callBackUrl, ctx, cache, isApp, undefined, true, code, message);
    if (body) {
      ret.body = body;
      return ret;
    }

    return ret;
  }

  /**
   * 结束应用
   * @param {*} data 
   */
  static appExit(data) {
    let type = undefined;
    if (tool.type(data) !== "Null") {
      if (typeof data === 'string') {
        // 检测是否为JSON数据格式
        if (data[0] === '{' || data[0] === '[') {
          try {
            JSON.parse(data);
            type = 'application/json; charset=utf-8';
          } catch (e) {
            // TODO
          }
        }
      }
    }

    return {
      status: true,
      body: data,
      type: type
    };
  }

  /**
   * 获取域名比较
   * @param {*} flag 
   * @param {*} hosts 
   * @returns 
   */
  static getCompDomain(flag, hosts) {
    let viewDomain = this.viewDomains[flag];
    if (viewDomain === undefined) {
      return;
    }

    let hostsLen = hosts.length;
    let retDomain;
    for (const i in viewDomain) {
      const iv = viewDomain[i];
      if (iv.total > hostsLen) {
        continue;
      }

      const ivDomains = iv.domains;
      let isBreak = true;
      let rep = {};

      for (const j in ivDomains) {
        let jv = ivDomains[j];
        if (jv === '*') {
          continue;
        } else if (jv[0] === '{') {
          rep[jv] = j;
          continue;
        } else if (jv !== hosts[j]) {
          isBreak = false;
          break;
        }
      }
      
      if (isBreak) {
        let ivValue = iv.value;
        for (const j in rep) {
          ivValue = ivValue.replace(new RegExp(j,"gm"), hosts[rep[j]]);
        }
        retDomain = {
          path: ivValue,
          config: iv
        };
        break;
      }
    }
    
    return retDomain;
  }

  /**
   * 子视图目录域名匹配
   * @param {*} ctx 
   * @returns 
   */
  static __getSubPath(ctx) {
    let origin = ctx.request.origin.toLocaleLowerCase();
    if (this.viewDomains[origin] !== undefined) {
      return this.viewDomains[origin];
    }

    let host = origin;
    let pos = host.indexOf("://");
    let defPort = '80';
    if (pos >= 0) {
      if (host.substring(0, pos) === 'https') {
        defPort = '443';
      }

      host = host.substring(pos + 3);
    }

    pos = host.indexOf(":");
    if (pos >= 0) {
      let pt = host.substring(pos + 1);
      if (pt !== '') {
        defPort = pt;
      }

      host = host.substring(0, pos);
    }

    let domains = [];
    let hosts = host.split(".");

    let defHost = this.getCompDomain(defPort, hosts);
    if (defHost !== undefined) {
      domains.push(defHost);
    }

    let allPort = this.getCompDomain('*', hosts);
    if (allPort !== undefined) {
      domains.push(allPort);
    }

    let oPath = this.viewDomainDefault;
    if (oPath === undefined) {
      oPath = '';
    }
    let domainsLen = domains.length;
    let domain;
    if (domainsLen === 1) {
      domain = domains[0];
    } else if (domainsLen === 2) {
      domain = domains[0];
      let d1 = domains[1];
      if (d1.config.total > domain.config.total) {
        domain = d1;
      } else if (d1.config.total === domain.config.total){
        if (d1.config.num < domain.config.num) {
          domain = d1;
        } else if (typeof domain.config.path === 'string' && typeof d1.config.path === 'number') {
          domain = d1;
        }
      }
    }

    let vDomain = '';
    if (domain !== undefined) {
      oPath = domain.path;

      // 端口号转义
      let domainPort = domain.config.port;
      if (typeof domainPort === 'string' && domainPort[0] === '{') {
        oPath = oPath.replace(new RegExp(domainPort,"gm"), defPort);
      }

      vDomain = domain.config.domain;
      if (domain.config.port !== '') {
        vDomain += ":" + domain.config.port;
      }
    }

    this.viewDomains[origin] = [vDomain, oPath];

    return this.viewDomains[origin];
  }

  /**
   * 子视图目录域名匹配
   * @param {*} ctx 
   * @returns 
   */
  static getSubPath(ctx) {
    const [domain, path] = this.__getSubPath(ctx);
    return path;
  }

  /**
   * 模板引擎渲染
   * @param {*} viewFile 
   * @param {*} viewData 
   * @param {*} viewDir 
   * @param {*} cache 
   * @param {*} handle 
   * @param {*} isApp 
   * @returns 
   */
  static async __render(viewFile, viewData, viewDir, cache, handle, isApp = true) {
    let sPath = '';
    let viewDirReal = viewDir;
    if (viewDirReal[0] === '@') {
      viewDirReal = viewDirReal.substring(1);
    } else {
      sPath = this.getSubPath(handle.ctx);
      if (sPath !== '') {
        sPath += "/";
      }
      viewFile = sPath + viewFile;
    }
    
    if (!this.isRender) {
      return await this.nunjucks.render(viewFile, viewData);
    }

    let {isFile, isError, html} = this.getHtmlInfo(viewDir, cache, handle.ctx);
    if (!isFile || isError) {
      return html;
    }
    
    try {
      return await Route.render(html, viewData, {
        dir: sPath + viewDirReal,
        path: Route.view.path,
        ext: Route.view.extName,
        cache: cache,
        filename: `${Route.path}/${Route.view.path}/${viewFile}`,
        handle: handle,
      });
    } catch (e) {
      let ret = await this.getAppError(e.message, 500, handle.ctx, cache, isApp);
      return ret.body;
    }
  }

  /**
   * 设置中间件
   * @param {*} extKey 
   * @param {*} hd 
   * @param {*} hdData 
   * @param {*} hdFiles 
   * @returns 
   */
  static async __setMiddleware(extKey, hd, hdData, hdFiles) {
    let mid = this.extFunctions.mid;
    let funcs = [];
    if (mid["*"] !== undefined) {
      for (const i in mid["*"]) {
        funcs.push(mid["*"][i]);
      }
    }

    if (extKey !== '*' && mid[extKey] !== undefined) {
      for (const i in mid[extKey]) {
        funcs.push(mid[extKey][i]);
      }
    }

    let jsData;
    
    try {
      for (const i in funcs) {
        let [isFunc, func] = funcs[i];
        if (isFunc) {
          jsData = func(hd, hdData, hdFiles);
        } else {
          jsData = await func(hd, hdData, hdFiles);
        }

        if (jsData !== undefined) {
          if (tool.type(jsData) === 'Promise') {
            jsData = await jsData;
          }
        }
        
        if (tool.type(jsData) !== "Null") {
          return [true, this.appExit(jsData)];
        }
      }
    } catch (e) {
      return [false, await e.message];
    }

    return;
  }

  /**
   * 获取数据
   * @param {*} extKey 
   * @param {*} jsData 
   * @param {*} hd 
   * @param {*} hdData 
   * @param {*} hdFiles 
   * @returns 
   */
  static async __getData(extKey, jsData, hd, hdData, hdFiles) {
    let extData = this.extFunctions.data;
    let funcs = [];
    if (extData["*"] !== undefined) {
      for (const i in extData["*"]) {
        funcs.push(extData["*"][i]);
      }
    }

    if (extKey !== '*' && extData[extKey] !== undefined) {
      for (const i in extData[extKey]) {
        funcs.push(extData[extKey][i]);
      }
    }

    if (funcs.length <= 0) {
      return jsData;
    }

    try {
      for (const i in funcs) {
        let [isFunc, func] = funcs[i];
        if (isFunc) {
          jsData = func(jsData, hd, hdData, hdFiles);
        } else {
          jsData = await func(jsData, hd, hdData, hdFiles);
        }
      }
    } catch (e) {
      return e.message;
    }

    return jsData;
  }

  /**
   * 扩展页面调用
   * @param {*} extName 
   * @param {*} extData 
   * @param {*} hd 
   * @param {*} data 
   * @param {*} files 
   * @returns 
   */
  static async appExtCall(extName, extData, hd, data, files) {
    let ec = this.extCalls[extName];
    let ecType = tool.type(ec);
    if (ecType === "Null") {
      return extData;
    }

    if (ecType === 'Function') {
      extData = ec(extData, hd, data, files);
    } else {
      extData = await ec(extData, hd, data, files);
    }

    return extData;
  }

  /**
   * 执行应用
   * @param {*} cUrl 
   * @param {*} ctx 
   * @param {*} cache 
   * @param {*} isApp 
   * @param {*} view 
   * @param {*} isError 
   * @param {*} errorCode 
   * @param {*} errorMessage 
   * @returns 
   */
  static async app(cUrl, ctx, cache, isApp = true, view = undefined, isError = false, errorCode = 0, errorMessage = '') {
    let [ext, urlDir] = Route.getUrlDir(cUrl);
    if (urlDir === 'favicon.ico') {
      return await Route.setFavicon(ctx);
    }
    
    // 防止访问配置外的目录
    if (urlDir.indexOf('../') >= 0) {
      return;
    }

    // 默认 index 路径
    if (urlDir === '') {
      urlDir = 'index';
    }

    let json = Route.getJson(urlDir, cache, ctx);
    let callDirs = [];

    // 默认路径
    if (ext === '') {
      let jLayout = json.layout;
      if (jLayout !== undefined && typeof jLayout === 'string') {
        jLayout = jLayout.trim();
        if (jLayout !== '') {
          callDirs.push(jLayout);
        }
      }
    }

    let jModule = json.module;
    if (jModule !== undefined && typeof jModule === 'string') {
      jModule = jModule.trim();
      if (jModule !== '' && !callDirs.includes(jModule)) {
        callDirs.push(jModule);
      }
    }

    let callList = [];

    for (const i in callDirs) {
      let cInfo = Route.getJsInfo(callDirs[i], cache, ctx);
      if (cInfo.isFile && cInfo.isError) {
        if (!isError) {
          return await this.getAppError(cInfo.call, 500, ctx, cache, isApp);
        }
        return;
      }

      callList.push(cInfo);
    }

    let jsData;
    let rootPath = Route.path + "/" + Route.view.path + "/";
    let rootSubPath = rootPath;
    let [sDomain, sPath] = this.__getSubPath(ctx);
    if (sPath !== '') {
      rootSubPath +=  sPath + "/";
    }

    let hd = new handle(ctx, json, view);
    let hdData = {};
    let hdFiles = {};
    let isExt = false;
    if (ctx.app.info.status) {
      hdData = ctx.app.info.data;
      hdFiles = ctx.app.info.files;
    }
    hd.data.maxAge = this.maxAge;
    hd.data.rootPath = rootPath;
    hd.data.ctxDir = urlDir;
    hd.data.route = this;
    hd.data.cache = cache;
    hd.data.domain = sDomain;
    hd.data.domainPath = sPath;

    let extKey = ext;
    if (extKey === '') {
      extKey = 'html';
    }

    if (!isError) {
      // 中间件
      let retMid = await Route.__setMiddleware(extKey, hd, hdData, hdFiles);
      if (retMid !== undefined) {
        let [status, mid] = retMid;
        if (status) {
          return mid;
        }

        return await this.getAppError(mid, 500, ctx, cache, isApp);
      }
    }

    // 执行文件方法
    for (const i in callList) {
      let cInfo = callList[i];
      if (cInfo.isFile) {
        let cCall = cInfo.call;
        let cCallType = tool.type(cCall);

        if (cCallType === "Null") {
          continue;
        }

        if (['', 'json'].includes(ext)) {
          if (cCallType === 'Object') {
            cCall = cCall['html'];
            if (cCall === undefined) {
              continue;
            }
          }
        } else {
          if (cCallType !== 'Object') {
            continue;
          }

          let cExt = cInfo.callLower[ext];
          if (cExt === undefined) {
            continue;
          }

          cCall = cCall[cExt];
          if (cCall === undefined) {
            continue;
          }

          isExt = true;
        }

        cCallType = tool.type(cCall);

        try {
          let oldExtName = hd.data.extName;
          hd.data.extName = ext;
          if (cCallType === 'Function') {
            jsData = cCall(hd, hdData, hdFiles);
          } else if (cCallType === 'AsyncFunction') {
            jsData = await cCall(hd, hdData, hdFiles);
          } else {
            jsData = cCall;
          }

          if (jsData !== undefined) {
            if (tool.type(jsData) === 'Promise') {
              jsData = await jsData;
            }
          }

          hd.data.extName = oldExtName;
        } catch (e) {
          if (!isError) {
            return await this.getAppError(e.message, 500, ctx, cache, isApp);
          }
          return;
        }
      }
    }

    let runData = async () => {
      if (!isError) {
        // 设置数据
        jsData = await Route.__getData(extKey, jsData, hd, hdData, hdFiles);
      }
    };

    // 如果body有设置则立即输出
    if (ctx.body !== undefined) {
      return;
    }

    // 如果是扩展路径则直接返回数据
    if (ext !== '') {
      if (this.extCalls[ext] !== undefined) {
        if (!['', 'json'].includes(ext)) {
          isExt = true;
        }

        if (isApp) {
          jsData = await this.appExtCall(ext, jsData, hd, hdData, hdFiles);
        }
      }

      if (!isExt) {
        await runData();
        if (ext === 'json' || tool.type(jsData) !== 'Null') {
          return this.appExit(jsData);
        }

        return;
      }

      jsData = appStatic.getBody(jsData, json, hd.data.code);
      await runData();

      let ret = this.appExit(jsData);
      ret['ext'] = ext;

      if (ctx.type !== undefined && ctx.type !== '') {
        return ret;
      }

      if (ext === '') {
        return ret;
      }
      
      if (ret.type === undefined && ret.body !== undefined) {
        if (this.extTypes[ext] === undefined) {
          ret['type'] = mime.types[ext];
        } else {
          ret['type'] = this.extTypes[ext];
        }
      }
      
      return ret;
    }

    // 如果模板文件和视图文件同时不存在则直接返回数据
    let hdExtFile = json.view + Route.view.ext;
    let extFile;
    if (hdExtFile[0] === '@') {
      hdExtFile = hdExtFile.substring(1);
      extFile = rootPath + hdExtFile;
    } else {
      extFile = rootSubPath + hdExtFile;
    }
    let extIsFile = this.isFile(extFile);
    let moduleFile = rootSubPath + jModule + ".js";
    let moduleIsFile = this.isFile(moduleFile);
    if (!moduleIsFile && !extIsFile) {
      if (isApp) {
        jsData = await this.appExtCall('html', jsData, hd, hdData, hdFiles);
      }
      await runData();
      return this.appExit(jsData);
    }
    
    let cBody;
    if (extIsFile) {
      // 处理layout模板
      let hdLayoutFile;
      let layoutFile;
      let isLayout = false;
      if (json.layout !== undefined) {
        hdLayoutFile = json.layout + Route.view.ext;
        if (hdLayoutFile[0] === '@') {
          hdLayoutFile = hdLayoutFile.substring(1);
          layoutFile = rootPath + hdLayoutFile;
        } else {
          layoutFile = rootSubPath + hdLayoutFile;
        }
        if (this.isFile(layoutFile)) {
          isLayout = true;
        }
      }

      let hdView = hd.data.view;
      if (tool.type(jsData) === 'Object') {
        for (const i in jsData) {
          if (hdView[i] === undefined) {
            hdView[i] = jsData[i];
          }
        }
      }

      // 错误页面处理
      if (isError) {
        hdView['code'] = errorCode;
        hdView['message'] = errorMessage;
      }

      cBody = await this.__render(hdExtFile, hdView, json.view, cache, hd, isApp);
      if (isLayout) {
        hdView['__layout__'] = cBody;
        cBody = await this.__render(hdLayoutFile, hdView, json.layout, cache, hd, isApp);
      }
    } else {
      cBody = jsData;
    }

    if (isApp) {
      cBody = await this.appExtCall('html', cBody, hd, hdData, hdFiles);
    }

    jsData = appStatic.getBody(cBody, json, hd.data.code);
    await runData();
    return {
      status: true,
      body: jsData,
      type: ctx.type
    };
  }
}

module.exports = Route;