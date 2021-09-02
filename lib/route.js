'use strict';

const fs = require("fs");
const mime = require("mime-types");
const handle = require("./handle");
const appStatic = require('./app-static');

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

    return [ext.toLocaleLowerCase(), dir + lastUrl];
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

    let sPath = this.getSubPath(ctx);
    if (sPath !== '') {
      path = sPath + "/" + path;
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
        let isError = false;
        try {
          delete require.cache[require.resolve(realPath)];
          requireCall = require(realPath);
        } catch (e) {
          requireCall = e.message;
          isError = true;
          console.error(requireCall);
        }

        let nReq = {
          isFile: true,
          mTime: statSync.mtimeMs + "",
          call: requireCall,
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
    } else if (typeof errPath !== 'string') {
      return ret;
    }

    errPath = this.dirTrim(errPath);
    errPath = errPath.replace(/[\\]/g, "/");
    if (errPath === '') {
      errPath = 'errors/' + code;
    }

    let callBackUrl = "/" + errPath;
    
    let sPath = this.getSubPath(ctx);
    if (sPath !== '') {
      sPath += "/";
    }

    const errRootPath = Route.path + "/" + Route.view.path + "/" + sPath + errPath;
    if (
      !this.isFile(errRootPath + Route.view.ext) &&
      !this.isFile(errRootPath + ".js") &&
      !this.isFile(errRootPath + ".json")
    ) {
      return ret;
    }

    let {body} = await this.app(callBackUrl, ctx, cache, undefined, true, code, message);
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
    if (data !== undefined) {
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
  static getSubPath(ctx) {
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

    if (domain !== undefined) {
      oPath = domain.path;

      // 端口号转义
      let domainPort = domain.config.port;
      if (typeof domainPort === 'string' && domainPort[0] === '{') {
        oPath = oPath.replace(new RegExp(domainPort,"gm"), defPort);
      }
    }

    this.viewDomains[origin] = oPath;

    return this.viewDomains[origin];
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
    let sPath = this.getSubPath(handle.ctx);
    if (sPath !== '') {
      sPath += "/";
    }
    viewFile = sPath + viewFile;
    
    if (!this.isRender) {
      return await this.nunjucks.render(viewFile, viewData);
    }

    let {isFile, isError, html} = this.getHtmlInfo(viewDir, cache, handle.ctx);
    if (!isFile || isError) {
      return html;
    }
    
    try {
      return await Route.render(html, viewData, {
        dir: sPath + viewDir,
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
    if (ec === undefined) {
      return extData;
    }

    if (ec.constructor.name === 'Function') {
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
    let sPath = this.getSubPath(ctx);
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

    for (const i in callList) {
      let cInfo = callList[i];
      if (cInfo.isFile) {
        let cCall = cInfo.call;
        if (cCall === undefined) {
          continue;
        }

        let cCallType = cCall.constructor.name;
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

          cCall = cCall[ext];
          if (cCall === undefined) {
            continue;
          }

          isExt = true;
        }

        cCallType = cCall.constructor.name;

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
            if (jsData.constructor.name === 'Promise') {
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
        if (ext === 'json') {
          return this.appExit(jsData);
        }

        return;
      }

      jsData = appStatic.getBody(jsData, json, hd.data.code);

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
    let extFile = rootSubPath + hdExtFile;
    let extIsFile = this.isFile(extFile);
    let moduleFile = rootSubPath + jModule + ".js";
    let moduleIsFile = this.isFile(moduleFile);
    if (!moduleIsFile && !extIsFile) {
      if (isApp) {
        jsData = await this.appExtCall('html', jsData, hd, hdData, hdFiles);
      }
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
        layoutFile = rootSubPath + hdLayoutFile;
        if (this.isFile(layoutFile)) {
          isLayout = true;
        }
      }

      let hdView = hd.data.view;
      if (jsData !== undefined && jsData.constructor.name === 'Object') {
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

    return {
      status: true,
      body: appStatic.getBody(cBody, json, hd.data.code),
      type: ctx.type
    };
  }
}

module.exports = Route;