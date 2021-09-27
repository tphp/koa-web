'use strict';

const fs = require("fs");
const crypto = require("crypto");
const koaStatic = require("koa-static");
const mount = require("koa-mount");
const path = require('path');
const nunjucks = require('nunjucks');
const formidable = require("formidable");
const route = require('./route');
const tool = require('./tool');

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

  // 配置信息
  static configGlobal = {};

  /**
   * 设置路由域名
   * @param {*} port 
   * @param {*} domain 
   * @param {*} value 
   * @param {*} domainConfigs 
   */
  static setRouteDomains(port, domain, value, domainConfigs) {
    let flag = '';
    let portLen = port.length;
    let domainReplaces = {};
    if (port === '') {
      flag = '*';
    } else if (port === '*') {
      flag = '*';
      port = '';
    } else if (port[0] === '{') {
      flag = '*';
      if (port[portLen - 1] !== '}') {
        return;
      }

      let portTmp = port.substring(1, portLen - 1);

      if (portTmp.indexOf(".") >= 0 || portTmp.indexOf("{") >= 0 || portTmp.indexOf("}") >= 0) {
        return;
      }

      domainReplaces[port] = true;
    } else if (/^(0|[1-9][0-9]*)$/.test(port)) {
      port = parseInt(port);
      // 端口范围 1 ~ 65535
      if (port <= 0 || port > 65535) {
        return;
      }
      flag = `${port}`;
    } else {
      return;
    }

    if (domain === '') {
      domain = '*';
    } else if (!/^[A-Za-z0-9\{\}\.\-\_\*]+$/.test(domain)) {
      return;
    }

    value = value.replace(/\\/g, "/").replace(/[\.\.]/g, "");

    if (value !== '' && !/^[A-Za-z0-9\{\}\.\-\_\/]+$/.test(value)) {
      return;
    }

    let domains = domain.split(".");
    let num = 0;
    let total = 0;
    for (let i in domains) {
      let iv = domains[i];
      let ivLen = iv.length;
      total ++;
      if (iv === '') {
        domains[i] = '*';
        num ++;
        continue;
      } else if (iv === '*') {
        num ++;
        continue;
      } else if (iv[0] === '{') {
        if (iv[ivLen - 1] !== '}') {
          return;
        }

        let ivTmp = iv.substring(1, ivLen - 1);
  
        if (ivTmp.indexOf("{") >= 0 || ivTmp.indexOf("}") >= 0) {
          return;
        }
        num ++;
        domainReplaces[iv] = true;
      } else if (/^[\{\}]+$/.test(iv)) {
        return;
      }
    }

    let values = value.split("/");
    let valueNews = [];
    let valueReplaces = {};
    for (let i in values) {
      let iv = values[i];
      let ivLen = iv.length;
      let ivLast = iv[ivLen - 1];
      if (iv === '' || iv[0] === '.' || ivLast === '.') {
        continue;
      } else if (iv.indexOf('{') >= 0) {
        let ivSplits = iv.split("{");
        for (const j in ivSplits) {
          let jv = ivSplits[j];
          let jvPos = jv.indexOf('}');
          if (jvPos >= 0) {
            let jvRep = jv.substring(0, jvPos);
            let jvDRep = `{${jvRep}}`;
            jv = jv.substring(jvPos + 1);
            if (jv.indexOf('}') >= 0) {
              ivSplits[j] = '}';
            } else if(domainReplaces[jvDRep] === true) {
              valueReplaces[jvDRep] = true;
              ivSplits[j] = `${jvRep}}${jv}`;
            } else {
              ivSplits[j] = `}${jv}`;
            }
          }
        }

        iv = ivSplits.join("{").replace(/(\{\})/g, "");
      } else if (/^[\{\}]+$/.test(iv)) {
        continue;
      }

      valueNews.push(iv);
    }

    if (domainConfigs[flag] === undefined) {
      domainConfigs[flag] = {};
    }

    if (domainConfigs[flag][total] === undefined) {
      domainConfigs[flag][total] = {};
    }

    if (domainConfigs[flag][total][num] === undefined) {
      domainConfigs[flag][total][num] = [];
    }

    domainConfigs[flag][total][num].push({
      domain: domain,
      domains: domains,
      num: num,
      total: total,
      value: valueNews.join("/"),
      replace: valueReplaces,
      port: port
    });
  }

  /**
   * 设置配置信息
   * @param {*} config 
   * @returns 
   */
  static setConfig(config) {
    if (tool.type(config) !== 'Object') {
      return;
    }

    this.configGlobal = config;

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

      let svDomains = staticView.domains;
      if (tool.type(svDomains) === 'Object') {
        let domainConfigs = {};
        for (let i in svDomains) {
          let iv = svDomains[i];
          if (i === '' || typeof i !== 'string' || typeof iv !== 'string') {
            continue;
          }
          i = i.replace(/\s/g, "").toLocaleLowerCase();
          iv = iv.replace(/\s/g, "").toLocaleLowerCase();
          let pos = i.indexOf(":");
          if (pos < 0) {
            this.setRouteDomains("", i, iv, domainConfigs);
          } else {
            let dm = i.substring(0, pos);
            let pt = i.substring(pos + 1);
            if (pt === '') {
              continue;
            }
            this.setRouteDomains(pt, dm, iv, domainConfigs);
          }
        }

        for (const i in domainConfigs) {
          let iv = domainConfigs[i];
          let ivDesc = Object.keys(iv).reverse();
          route.viewDomains[i] = [];
          for (const j in ivDesc) {
            let jv = iv[ivDesc[j]];
            for (const k in jv) {
              for (const m in jv[k]) {
                let mv = jv[k][m];
                route.viewDomains[i].push(mv);
              }
            }
          }
        }
      }

      let svDf = staticView.domainDefault;
      if (typeof svDf === 'string') {
        svDf = route.dirTrim(svDf.replace(/\s/g, ""));
        route.viewDomainDefault = svDf;
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

    if (tool.type(config.json) === 'Object') {
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

    if (tool.type(config.extTypes) === 'Object') {
      for (const i in config.extTypes) {
        let iv = config.extTypes[i];
        if (tool.type(iv) === 'String') {
          route.extTypes[i] = iv;
        }
      }
    }

    if (tool.type(config.extCalls) === 'Object') {
      for (const i in config.extCalls) {
        let iv = config.extCalls[i];
        if (['Function', 'AsyncFunction'].includes(tool.type(iv))) {
          route.extCalls[i] = iv;
        }
      }
    }
  }

  /**
   * 判断是否可设置方法
   * @param {*} extKey 
   * @param {*} func 
   */
  static setFunction(extKey = undefined, func = undefined, setData = {}) {
    if (tool.type(extKey) !== 'String') {
      return;
    }

    extKey = extKey.replace(/[\s]/g, "");
    if (extKey === '') {
      return;
    }

    let funcType = tool.type(func);
    if (!['Function', 'AsyncFunction'].includes(funcType)) {
      return;
    }

    if (setData[extKey] === undefined) {
      setData[extKey] = [];
    }

    setData[extKey].push([funcType === 'Function', func]);
  }

  /**
   * 设置页面中间件
   * @param {*} extKey 扩展链接
   * @param {*} func 中间件设置
   */
  static setMiddleware(extKey = undefined, func = undefined) {
    App.setFunction(extKey, func, route.extFunctions.mid);
  }

  /**
   * 设置页面数据
   * @param {*} extKey 扩展链接
   * @param {*} func 数据设置
   */
   static setData(extKey = undefined, func = undefined) {
    App.setFunction(extKey, func, route.extFunctions.data);
  }

  /**
   * 设置koa中间件
   * @param {*} func 数据设置
   */
   static setLoad(func = undefined) {
    let funcType = tool.type(func);
    if (!['Function', 'AsyncFunction'].includes(funcType)) {
      return;
    }
    
    route.extFunctions.load.push([funcType === 'Function', func]);
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
  static async loadCtx(ctx) {
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

    for (const i in route.extFunctions.load) {
      let [isFunc, func] = route.extFunctions.load[i];
      if (isFunc) {
        func(app, this.configGlobal);
      } else {
        await func(app, this.configGlobal);
      }
    }

    nunjucks.configure(`${this.path}/${this.view.path}`, {
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
    await App.loadCtx(ctx);
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
  let cType = tool.type(config);
  if (cType === "Null" || cType === 'Object') {
    App.setConfig(config);
    return App.app;
  }

  if (['Function', 'AsyncFunction'].includes(cType)) {
    config(App.setMiddleware, App.setData, App.setLoad);
  }
};
