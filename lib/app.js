'use strict';

const fs = require("fs");
const crypto = require("crypto");
const koaStatic = require("koa-static");
const mount = require("koa-mount");
const path = require('path');
const nunjucks = require('nunjucks');
const formidable = require("formidable");
const route = require('./route');

/**
 * dir route system
 */


class App {

  // 主路径
  static path;

  static isLoad = false;

  // 静态文件路径
  static static = {};

  // 缓存时间
  static staticMaxage = 0;

  static view = {
    path: "html",
    ext: "html",
    extName: ""
  };

  // 页面缓存
  static cache = false;

  // 错误页面
  static errors = {};

  // 页面统计
  static urlMd5s = {};

  /**
   * 设置配置信息
   * @param {*} config 
   * @returns 
   */
  static setConfig(config) {
    if (config === undefined) {
      return;
    }

    if (config.constructor.name !== 'Object') {
      return;
    }

    let configStatic = config.static;
    let configPath = config.path;
    if (typeof configPath !== 'string') {
      configPath = path.resolve();
    }
    this.path = configPath;

    if (typeof configStatic === 'string') {
      this.static['/static'] = configStatic;
    } else if (configStatic instanceof Array) {
      for (const i in configStatic) {
        let iv = configStatic[i];
        if (typeof iv !== 'string') {
          continue;
        }
        iv = route.dirTrim(iv);
        if (iv === '') {
          continue;
        }

        iv = "/" + iv;

        this.static[iv] = configPath + iv;
      }
    } else if (configStatic instanceof Object) {
      for (const i in configStatic) {
        let key = i;
        if (typeof key !== 'string') {
          continue;
        }

        key = route.dirTrim(key);
        if (key === '') {
          continue;
        }

        let iv = configStatic[i];
        if (typeof iv !== 'string') {
          continue;
        }

        if (!(iv[0] === '/' || iv[0] === '\\' || iv.indexOf(":") > 0)) {
          iv = configPath + "/" + iv;
        }

        this.static['/' + key] = iv;
      }
    }

    if (Object.keys(this.static).length <= 0) {
      this.static['/static'] = configPath + '/static';
    }

    let staticMaxage = config.staticMaxage;
    if (typeof staticMaxage === 'number' && staticMaxage >= 0) {
      this.staticMaxage = staticMaxage;
    }

    let staticView = config.view;
    if (staticView instanceof Object) {
      if (typeof staticView.path === 'string') {
        this.view.path = staticView.path;
      }

      if (typeof staticView.ext === 'string') {
        if (!['js', 'json'].includes(staticView.ext)) {
          this.view.ext = staticView.ext;
        }
      }
    }

    if (this.view.ext !== '') {
      this.view.extName = this.view.ext;
      this.view.ext = "." + this.view.ext;
    } else {
      this.view.extName = '';
    }

    if (typeof config.cache === 'boolean') {
      this.cache = config.cache;
    }

    if (config.json !== undefined && config.json.constructor.name === 'Object') {
      for (const i in config.json) {
        route.json[i] = config.json[i];
      }
    }

    if (config.errors instanceof Object) {
      route.errors = config.errors;
    }

    if (config.render !== undefined && typeof config.render === 'function') {
      route.render = config.render;
      route.isRender = true;
    }

    if (config.extTypes !== undefined && config.extTypes.constructor.name === 'Object') {
      for (const i in config.extTypes) {
        let iv = config.extTypes[i];
        if (iv !== undefined && iv.constructor.name === 'String') {
          route.extTypes[i] = iv;
        }
      }
    }

    if (config.extCalls !== undefined && config.extCalls.constructor.name === 'Object') {
      for (const i in config.extCalls) {
        let iv = config.extCalls[i];
        if (iv !== undefined && ['Function', 'AsyncFunction'].includes(iv.constructor.name)) {
          route.extCalls[i] = iv;
        }
      }
    }
  }

  /**
   * 获取Post字符串
   * @param {*} ctx 
   * @returns 
   */
   static async getPostData(ctx) {
    // 如果content-type类型为text/plain则当做application/json处理
    let cType = ctx.header['content-type'];
    let isReplace = false;
    let srcType = cType;

    if (cType !== undefined) {
      let plain = 'text/plain';

      if (cType.indexOf(plain) >= 0) {
        cType = cType.replace(plain, "application/json");
        ctx.header['content-type']  = cType;
        isReplace = true;
      }
    }

    let rType = 'unknow';
    if (cType === undefined) {
      rType = 'get';
    } else {
      if (cType.indexOf("application/json") >= 0) {
        rType = 'json';
      } else if (cType.indexOf("application/x-www-form-urlencoded") >= 0) {
        rType = 'xform';
      } else if (cType.indexOf("multipart/form-data") >= 0) {
        rType = 'form';
      }
    }

    return new Promise((resolve) => {
      const form = formidable({
        multiples: true
      });

      let retInfo = {
        status: false,
        data: {},
        files: {},
        errMessage: '',
        body: '',
        type: rType
      };

      try {
        ctx.req.on('data', (data) => {
          retInfo.body += data;
        });

        form.parse(ctx.req, (err, data, files) => {
          if (isReplace) {
            ctx.header['content-type'] = srcType;
          }

          if (err) {
            retInfo.errMessage = err.message;
            resolve(retInfo);
            return false;
          }
          
          if (retInfo.body.trim()[0] === '[') {
            data = Object.values(data);
          }

          retInfo.status = true;
          retInfo.data = data;
          retInfo.files = files;
          resolve(retInfo);
        });
      } catch (err) {
        retInfo.errMessage = err.message;
        resolve(retInfo);
        if (isReplace) {
          ctx.header['content-type'] = srcType;
        }
      }
    })
  }

  /**
   * 初始化设置
   * @param {*} ctx 
   * @returns 
   */
  static setLoad(ctx) {
    let app = ctx.app;

    app.call = this.call(ctx);

    // 页面访问次数统计
    ctx.app.viewCount = 0;

    if (this.isLoad) {
      return;
    }

    this.isLoad = true;

    // 静态文件解析
    if (Object.keys(this.static).length > 0) {
      for (const i in this.static) {
        app.use(mount(i, koaStatic(this.static[i], {
          maxage: this.staticMaxage
        })));
      }
    }

    nunjucks.configure(this.view.path, {
      autoescape: true,
      noCache: !this.cache
    });

    route.path = this.path;
    route.view = this.view;
    route.nunjucks = nunjucks;
    route.maxAge = this.staticMaxage
  }
  
  /**
   * 结束页面后处理
   * @param {*} ctx 
   * @returns 
   */
  static async closeApp(ctx) {
    // Windows 系统存在BUG
    if (process.platform === 'win32') {
      return;
    }

    if (ctx.app.info === undefined || !ctx.app.info.status) {
      return;
    }

    // 删除生成临时文件
    let files = ctx.app.info.files;
    
    if (!(files instanceof Object)) {
      return;
    }

    for (const i in files) {
      let iv = files[i];
      if (!(iv instanceof Object)) {
        continue;
      }

      if (fs.existsSync(iv.path)) {
        fs.unlinkSync(iv.path);
      }
    }
  }

  /**
   * 返回 koa 对象
   * @param {*} ctx 
   * @param {*} next 
   */
  static async app(ctx, next) {
    const urlMd5 = crypto.createHash('md5').update(ctx.url).digest("hex");

    // 访问控制
    if (App.urlMd5s[urlMd5] === undefined) {
      App.urlMd5s[urlMd5] = 0;
    } else {
      App.urlMd5s[urlMd5] ++;
    }

    if (App.urlMd5s[urlMd5] > 100) {
      await next();
      delete App.urlMd5s[urlMd5];
      ctx.body = "Error: Too many requests";
      return;
    }

    // 获取提交数据
    ctx.app.info = await App.getPostData(ctx);

    // 初始化加载
    App.setLoad(ctx);
    await next();

    let rType = undefined;
    let ext = undefined;
    if (!ctx.body) {
      let ret = await route.app(ctx.url, ctx, App.cache);
      if (ret) {
        let {body, type} = ret;
        if (body) {
          ctx.body = body;
        }
        if (type) {
          rType = type;
        }

        ext = ret['ext'];
      }
    }

    if (!ctx.body) {
      let {body, type} = await route.getAppError('404 Error!', 404, ctx, App.cache);
      if (body) {
        ctx.body = body;
      }

      if (type) {
        rType = type;
      }
    }

    if (rType) {
      ctx.type = rType;
    } else if (ctx.type === 'text/plain') {
      if (ext === undefined || ext === '') {
        ctx.type = 'text/html; charset=utf-8';
      }
    }
    
    await App.closeApp(ctx);

    // 结束后删除统计
    delete App.urlMd5s[urlMd5];
  }

  /**
   * 格式化url
   * @param {*} ctxDir 
   * @param {*} url 
   * @returns 
   */
  static callDirFormat(ctxDir, url) {
    if (url === undefined || typeof url !== 'string') {
      return '';
    }

    url = url.trim();
    if (url === '') {
      return url;
    }

    let urlQuery = "";
    let posQuery = url.indexOf("?");
    let pos = url.indexOf("#");
    if (pos < 0) {
      pos = posQuery;
    } else if (posQuery >= 0 && posQuery < pos) {
      pos = posQuery;
    }

    if (pos >= 0) {
      urlQuery = url.substring(pos);
      url = url.substring(0, pos);
    }

    url = url.trim().replace(/[\\]/g, "/");
    if (url[0] === '/') {
      return url + urlQuery;
    }

    let isThis = false;
    if (url[0] === '.' && url[1] === '/') {
      url = url.substring(2);
      pos = ctxDir.lastIndexOf('/');
      if (pos >= 0) {
        ctxDir = ctxDir.substring(0, pos);
      }
    } else if (url[0] === '$') {
      url = url.substring(1);
      isThis = true;
    } else {
      let deep = 1;
      while (url[0] === '.' && url[1] === '.' && url[2] === '/') {
        url = url.substring(3);
        deep ++;
      }

      let ctxDirSplit = ctxDir.split("/");
      let newSplit = [];
      let iPos = ctxDirSplit.length - deep;
      for (let i = 0; i < iPos; i ++ ){
        newSplit.push(ctxDirSplit[i]);
      }
      
      ctxDir = newSplit.join("/");
    }

    url = url.replace(/(\.\.\/)/g, "/").replace(/(\.\/)/g, "/");

    let urlSplit = url.split("/");
    let newUrlSplit = [];
    for (const i in urlSplit) {
      let iv = urlSplit[i].trim();
      if (iv !== '') {
        newUrlSplit.push(iv);
      }
    }

    url = newUrlSplit.join("/");
    
    if (ctxDir !== '') {
      ctxDir = `/${ctxDir}`;
    }

    if (!isThis) {
      ctxDir = `${ctxDir}/`;
    }
    
    return `${ctxDir}${url}${urlQuery}`;
  }

  /**
   * 页面调用
   * @param {*} ctx 
   * @returns 
   */
  static call(ctx) {
    return async (url, view = {}, ctxDir) => {
      if (typeof url !== 'string') {
        return '';
      }

      if (ctxDir === undefined) {
        ctxDir = '';
      }
      
      url = this.callDirFormat(ctxDir, url);
      
      let ret = await route.app(url, ctx, App.cache, false, view);
      if (ret) {
        let {body} = ret;
        return body;
      }

      return;
    };
  }
}

/**
 * 设置入口
 * @param {*} config 
 * @returns 
 */
module.exports = (config = {}) => {
  App.setConfig(config);
  return App.app;
};
