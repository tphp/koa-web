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
    let arr = str.replace(/[\\]/g, "/").split("/");
    let newArr = [];
    for (const i in arr) {
      let iv = arr[i];
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
    if (pos > 0) {
      let ext = lastUrl.substring(pos + 1).toLocaleLowerCase();
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
    let faviconFile = "/" + this.view.path + "/favicon.ico";
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
   * 动态加载JS文件
   * @param {*} path 
   * @param {*} cache 
   * @returns 
   */
  static getJsInfo(path, cache) {
    let oReq = this.requires[path];
    if (cache && oReq !== undefined) {
      return oReq;
    }

    let realPath = this.path + "/" + this.view.path + "/" + path + ".js";
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

      this.requires[path] = {
        isFile: false
      };

      return this.requires[path];
    }

    if (oReq !== undefined && oReq.mTime === statSync.mtimeMs + "") {
      return oReq;
    }

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
    let oJson = this.jsons[path];
    if (cache && oJson !== undefined) {
      return oJson;
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
   * @returns 
   */
  static getJson(path, cache) {
    let jsonInfo = Route.getJsonInfo(path, cache);
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
      let rInfo = Route.getJsonInfo(rLayout, cache);
      if (rInfo.isFile) {
        let rrInfo = JSON.parse(JSON.stringify(rInfo.json));
        for (const i in rrInfo) {
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
   * @param {*} cache 
   * @returns 
   */
  static async getAppError(message, code = 404, ctx, cache) {
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
    errPath = errPath.replace(/[.]/g, "/").replace(/[\\]/g, "/");
    if (errPath === '') {
      errPath = 'errors/' + code;
    }

    let callBackUrl = "/" + errPath;
    
    const errRootPath = Route.path + "/" + Route.view.path + "/" + errPath;
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
   * @param {*} ctx 
   * @param {*} data 
   */
  static appExit(ctx, data) {
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
   * 执行应用
   * @param {*} cUrl 
   * @param {*} ctx 
   * @param {*} cache 
   * @returns 
   */
  static async app(cUrl, ctx, cache, view = undefined, isError = false, errorCode = 0, errorMessage = '') {
    let urlDir = Route.getUrlDir(cUrl);
    if (urlDir === 'favicon.ico') {
      return await Route.setFavicon(ctx);
    }

    // 默认 index 路径
    if (urlDir === '') {
      urlDir = 'index';
    }

    let json = Route.getJson(urlDir, cache);
    let callDirs = [];
    let jLayout = json.layout;
    if (jLayout !== undefined && typeof jLayout === 'string') {
      jLayout = jLayout.trim();
      if (jLayout !== '') {
        callDirs.push(jLayout);
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
      let cInfo = Route.getJsInfo(callDirs[i], cache);
      if (cInfo.isFile && cInfo.isError) {
        if (!isError) {
          return await this.getAppError(cInfo.call, 500, ctx, cache);
        }
        return;
      }

      callList.push(cInfo);
    }

    let jsData;
    let hd = new handle(ctx, json, view);
    let hdData = {}
    let hdFiles = {};
    if (ctx.app.info.status) {
      hdData = ctx.app.info.data;
      hdFiles = ctx.app.info.files;
    }

    for (const i in callList) {
      let cInfo = callList[i];
      if (cInfo.isFile) {
        if (typeof cInfo.call === 'function') {
          try {
            jsData = await cInfo.call(hd, hdData, hdFiles);
          } catch (e) {
            if (!isError) {
              return await this.getAppError(e.message, 500, ctx, cache);
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
    let hdExtFile = json.view + Route.view.ext;
    let extFile = rootPath + hdExtFile;
    let extIsFile = this.isFile(extFile);
    let moduleFile = rootPath + jModule + ".js";
    let moduleIsFile = this.isFile(moduleFile);
    if (!moduleIsFile && !extIsFile) {
      return this.appExit(ctx, jsData);
    }
    
    let cBody;
    if (extIsFile) {
      // 处理layout模板
      let hdLayoutFile;
      let layoutFile;
      let isLayout = false;
      if (json.layout !== undefined) {
        hdLayoutFile = json.layout + Route.view.ext;
        layoutFile = rootPath + hdLayoutFile;
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

      cBody = await this.nunjucks.render(hdExtFile, hdView);
      if (isLayout) {
        hdView['__layout__'] = cBody;
        cBody = await this.nunjucks.render(hdLayoutFile, hdView);
      }
    } else {
      cBody = jsData;
    }

    return {
      status: true,
      body: appStatic.getBody(cBody, json, hd.data.code),
      type: undefined
    };
  }
}

module.exports = Route;