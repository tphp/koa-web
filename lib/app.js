'use strict';

const koaStatic = require("koa-static");
const mount = require("koa-mount");
const path = require('path');
const nunjucks = require('nunjucks')
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
    ext: "html"
  }

  // 页面缓存
  static cache = false;

  // 错误页面
  static errors = {}

  /**
   * 设置配置信息
   * @param {*} config 
   * @returns 
   */
  static setConfig(config) {
    if (typeof config !== 'object') {
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
      for (let i in configStatic) {
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
      for (let i in configStatic) {
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
        if (['js', 'json'].indexOf(staticView.ext) < 0) {
          this.view.ext = staticView.ext;
        }
      }
    }

    if (this.view.ext !== '') {
      this.view.ext = "." + this.view.ext;
    }

    if (typeof config.cache === 'boolean') {
      this.cache = config.cache;
    }

    if (!(config.json instanceof Array) && config.json instanceof Object) {
      for (let i in config.json) {
        route.json[i] = config.json[i];
      }
    }

    if (config.errors instanceof Object) {
      route.errors = config.errors;
    }
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

    if (Object.keys(this.static).length > 0) {
      for (let i in this.static) {
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
  }

  /**
   * 返回 koa 对象
   * @param {*} ctx 
   * @param {*} next 
   */
  static async app(ctx, next) {
    // 初始化加载
    App.setLoad(ctx);

    let ret = await route.app(ctx.url, ctx, App.cache);
    let rType = undefined;
    if (ret) {
      let {body, type} = ret;
      if (body) {
        ctx.body = body;
      }
      if (type) {
        rType = type;
      }
    }
    await next();
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
      ctx.type = 'text/html; charset=utf-8';
    }
  }

  /**
   * 页面调用
   * @param {*} ctx 
   * @returns 
   */
  static call(ctx) {
    return async (url, view = {}) => {
      if (typeof url !== 'string') {
        return '';
      }

      url = url.trim().replace(/[\\]/g, "/").replace(/[.]/g, "/");
      if (url[0] != "/") {
        url = "/" + url;
      }

      let ret = await route.app(url, ctx, App.cache, view);
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