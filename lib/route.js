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
  static json = {};

  // 动态加载JS文件
  static requires = {};

  // 动态加载JSON文件
  static jsons = {};

  // 错误页面
  static errors = {}

  /**
   * 格式化目录
   * @param {*} str 
   * @returns 
   */
  static dirTrim(str) {
    var arr = str.replace(/[\\]/g, "/").split("/");
    var newArr = [];
    for (var i in arr) {
      var iv = arr[i];
      if (iv !== '') {
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
    var pos = url.indexOf("?");
    if (pos > 0) {
      url = url.substring(0, pos);
    }
    url = url.substring(1);
    while (url[url.length - 1] === '/') {
      url = url.substring(0, url.length - 1);
    }

    pos = url.lastIndexOf("/");

    var lastUrl = "";
    var dir = "";
    if (pos > 0) {
      lastUrl = url.substring(pos + 1);
      dir = url.substring(0, pos + 1);
    } else {
      lastUrl = url;
    }

    pos = lastUrl.lastIndexOf(".");
    if (pos > 0) {
      var ext = lastUrl.substring(pos + 1).toLocaleLowerCase();
      if (ext === '' || ext === 'htm' || ext === 'html') {
        lastUrl = lastUrl.substring(0, pos);
      }
    }

    return dir + lastUrl;
  }

  /**
   * 加载 favicon.ico 文件
   * @param {*} ctx 
   * @returns 
   */
  static async setFavicon(ctx) {
    var faviconFile = "/" + this.view.path + "/favicon.ico";
    var filePath = this.path + faviconFile;
    if (!this.isFile(filePath)) {
      ctx.body = "favicon.ico from: " + faviconFile;
      return;
    }

    var statSync = fs.statSync(filePath);
    if (statSync.isFile()) {
      var file = fs.readFileSync(filePath);
      let mimeType = mime.lookup(filePath);
      ctx.set('content-type', mimeType);
      ctx.body = file;
    } else {
      ctx.body = "Is Not Files";
    }
  }

  /**
   * 动态加载JS文件
   * @param {*} path 
   * @param {*} cache 
   * @returns 
   */
  static getJsInfo(path, cache) {
    var oReq = this.requires[path];
    if (cache && oReq !== undefined) {
      return oReq;
    }

    var realPath = this.path + "/" + this.view.path + "/" + path + ".js";
    var isFile = false;
    var statSync;
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

      this.requires[path] = {
        isFile: false
      };

      return this.requires[path];
    }

    if (oReq !== undefined && oReq.mTime === statSync.mtimeMs + "") {
      return oReq;
    }

    // 删除调用缓存，热加载
    var requireCall;
    var isError = false;
    try {
      delete require.cache[require.resolve(realPath)];
      requireCall = require(realPath);
    } catch (e) {
      requireCall = e.message;
      isError = true;
      console.log(requireCall);
    }

    var nReq = {
      isFile: true,
      mTime: statSync.mtimeMs + "",
      call: requireCall,
      isError: isError
    };

    this.requires[path] = nReq;
    return nReq;
  }

  /**
   * 动态加载JSON文件
   * @param {*} path 
   * @param {*} cache 
   * @returns 
   */
  static getJsonInfo(path, cache) {
    var oJson = this.jsons[path];
    if (cache && oJson !== undefined) {
      return oJson;
    }

    var realPath = this.path + "/" + this.view.path + "/" + path + ".json";
    var isFile = false;
    var statSync;
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
    var jsonData;
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

    var nJson = {
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
    if (['css', 'js'].indexOf(keyName) < 0) {
      if (newData === undefined) {
        return srcData;
      }

      return newData;
    }

    var retData = {};
    var dataList = [srcData, newData];
    if (srcData !== undefined) {
      dataList.push(srcData);
    }
    if (newData !== undefined) {
      dataList.push(newData);
    }

    if (dataList.length <= 0) {
      return retData;
    }

    var dList = [];
    for (var i in dataList) {
      var iv = dataList[i];
      if (typeof iv === 'string') {
        iv = iv.trim();
        if (iv !== '') {
          dList.push(iv);
        }
      } else if (iv instanceof Array) {
        for (var j in iv) {
          var jv = iv[j];
          if (typeof jv === 'string') {
            jv = jv.trim();
            if (jv !== '') {
              dList.push(jv);
            }
          }
        }
      }
    }

    for (var i in dList) {
      var iv = dList[i];
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
   * @returns 
   */
  static getJson(path, cache) {
    var jsonInfo = Route.getJsonInfo(path, cache);
    var retJson = JSON.parse(JSON.stringify(this.json));
    if (jsonInfo.isFile) {
      var jInfo = JSON.parse(JSON.stringify(jsonInfo.json));
      for (var i in jInfo) {
        retJson[i] = this.getJsonHandle(i, retJson[i], jInfo[i]);
      }
    }

    // 默认模块、视图设置
    var defaults = ['module', 'view'];
    for (var i in defaults) {
      var iv = defaults[i];
      var rj = retJson[iv];
      if (rj === undefined || typeof rj !== 'string' || rj.trim() === '') {
        retJson[iv] = path;
      }
    }

    var rLayout = retJson.layout;
    if (typeof rLayout === 'string') {
      var rInfo = Route.getJsonInfo(rLayout, cache);
      if (rInfo.isFile) {
        var rrInfo = JSON.parse(JSON.stringify(rInfo.json));
        for (var i in rrInfo) {
          retJson[i] = this.getJsonHandle(i, rrInfo[i], retJson[i]);
        }
      }
    }

    rLayout = retJson.layout;
    if (typeof rLayout === 'string') {
      retJson.layout = this.dirTrim(rLayout.replace(/[.]/g, "/"));
    }
    return retJson;
  }

  /**
   * 错误页面处理
   * @param {*} message 
   * @param {*} code 
   * @param {*} ctx 
   * @param {*} next 
   * @param {*} cache 
   * @returns 
   */
  static async getAppError(message, code = 404, ctx, next, cache) {
    var errPath = this.errors[code];
    ctx.response.status = code;
    if (errPath === undefined) {
      errPath = '';
    } else if (typeof errPath !== 'string') {
      return message;
    }

    errPath = this.dirTrim(errPath);
    errPath = errPath.replace(/[.]/g, "/").replace(/[\\]/g, "/");
    if (errPath === '') {
      errPath = 'errors/' + code;
    }

    var callBackUrl = "/" + errPath;
    
    const errRootPath = Route.path + "/" + Route.view.path + "/" + errPath;
    if (
      !this.isFile(errRootPath + Route.view.ext) &&
      !this.isFile(errRootPath + ".js") &&
      !this.isFile(errRootPath + ".json")
    ) {
      return message;
    }

    await this.app(callBackUrl, ctx, next, cache, true, code, message);
    if (ctx.body) {
      return ctx.body;
    }

    return message;
  }

  /**
   * 结束应用
   * @param {*} ctx 
   * @param {*} data 
   */
  static appExit(ctx, data) {
    if (data !== undefined) {
      ctx.body = data;
      if (typeof data === 'string') {
        // 检测是否为JSON数据格式
        if (data[0] === '{' || data[0] === '[') {
          try {
            JSON.parse(data);
            ctx.type = 'application/json; charset=utf-8';
          } catch (e) {
            // TODO
          }
        }
      }
    }
  }

  /**
   * 执行应用
   * @param {*} cUrl 
   * @param {*} ctx 
   * @param {*} next 
   * @param {*} cache 
   * @returns 
   */
  static async app(cUrl, ctx, next, cache, isError = false, errorCode = 0, errorMessage = '') {
    var urlDir = Route.getUrlDir(cUrl);
    if (urlDir === 'favicon.ico') {
      await Route.setFavicon(ctx);
      return;
    }

    // 默认 index 路径
    if (urlDir === '') {
      urlDir = 'index';
    }

    var json = Route.getJson(urlDir, cache);
    var callDirs = [];
    var jLayout = json.layout;
    if (jLayout !== undefined && typeof jLayout === 'string') {
      jLayout = jLayout.trim();
      if (jLayout !== '') {
        callDirs.push(jLayout);
      }
    }

    var jModule = json.module;
    if (jModule !== undefined && typeof jModule === 'string') {
      jModule = jModule.trim();
      if (jModule !== '' && callDirs.indexOf(jModule) < 0) {
        callDirs.push(jModule);
      }
    }

    var callList = [];

    for (var i in callDirs) {
      var cInfo = Route.getJsInfo(callDirs[i], cache);
      if (cInfo.isFile && cInfo.isError) {
        if (!isError) {
          ctx.body = await this.getAppError(cInfo.call, 500, ctx, next, cache);
        }
        return;
      }

      callList.push(cInfo);
    }

    var jsData;
    var hd = new handle(ctx, next, json);

    for (var i in callList) {
      var cInfo = callList[i];
      if (cInfo.isFile) {
        if (typeof cInfo.call === 'function') {
          try {
            jsData = await cInfo.call(hd);
          } catch (e) {
            if (!isError) {
              ctx.body = await this.getAppError(e.message, 500, ctx, next, cache);
            }
            return;
          }
        } else {
          jsData = cInfo.call;
        }
      }
    }

    // 如果body有设置则立即输出
    if (ctx.body !== undefined) {
      return;
    }
    
    const rootPath = Route.path + "/" + Route.view.path + "/";

    // 如果模板文件和视图文件同时不存在则直接返回数据
    var hdExtFile = json.view + Route.view.ext;
    var extFile = rootPath + hdExtFile;
    var extIsFile = this.isFile(extFile);
    var moduleFile = rootPath + jModule + ".js";
    if (!this.isFile(moduleFile) && !extIsFile) {
      this.appExit(ctx, jsData);
      return;
    }

    // 处理layout模板
    var hdLayoutFile;
    var layoutFile;
    var isLayout = false;
    if (json.layout !== undefined) {
      hdLayoutFile = json.layout + Route.view.ext;
      layoutFile = rootPath + hdLayoutFile;
      if (this.isFile(layoutFile)) {
        isLayout = true;
      }
    }

    var hdView = hd.data.view;
    if (jsData instanceof Object && !(jsData instanceof Array)) {
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

    var cBody = json.view + ' Is Not Found!';
    if (extIsFile) {
      cBody = await this.nunjucks.render(hdExtFile, hdView);
    }

    if (isLayout) {
      hdView['__layout__'] = cBody;
      cBody = await this.nunjucks.render(hdLayoutFile, hdView);
    }

    ctx.body = appStatic.getBody(cBody, json, hd.data.code);
    ctx.type = 'text/html; charset=utf-8';
  }
}

module.exports = Route;