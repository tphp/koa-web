'use strict';

const fs = require("fs");
const HandleHttp = require('./handle-http');

/**
 * 工具类
 */

class Handle {
  ctx;

  data = {
    view: {},
    json: {},
    code: {
      style: [],
      script: []
    },
    extName: '',
    maxAge: 0,
    rootPath: '',
    ctxDir: '',
    domain: '',
    domainPath: '',
    route: {},
    cache: false
  };

  hd = {
    /**
     * 设置JSON数据
     * @param {*} key 
     * @param {*} data 
     */
    setJson: (key, data) => {
      this.data.json[key] = data;
    },

    /**
     * 获取JSON数据
     * @param {*} key 
     * @param {*} def 
     * @returns 
     */
    getJson: (key, def = undefined) => {
      if (this.data.json[key] === undefined) {
        return def;
      }

      return this.data.json[key];
    },

    /**
     * 设置今天页面
     * @param {*} config 
     * @param {*} type 
     * @returns 
     */
    setStatic: (config, type = 'css') => {
      if (config === undefined) {
        return;
      }

      let sets = [];
      if (typeof config === 'string') {
        config = config.trim();
        if (config !== '') {
          sets.push(config);
        }
      } else if (config instanceof Array) {
        config.forEach(cf => {
          if (typeof cf !== 'string') {
            return true;
          }

          cf = cf.trim();
          if (cf === '') {
            return true;
          }

          sets.push(cf);
        });
      }

      if (sets.length <= 0) {
        return;
      }

      if (this.data.json[type] === undefined) {
        this.data.json[type] = {};
      }

      sets.forEach(set => {
        if (set[0] === '@') {
          this.data.json[type][set.substring(1)] = true;
        } else {
          this.data.json[type][set] = false;
        }
      });
    },

    /**
     * 读取扩展文件
     * @param {*} extName 
     * @param {*} isFile 
     * @returns 
     */
    read: (extName = undefined, isFile = false) => {
      if (extName === undefined) {
        extName = this.data.extName;
      } else if (typeof extName === 'string') {
        extName = extName.trim();
      } else {
        return;
      }

      if (extName === '') {
        extName = this.data.extName;
      }

      if (extName === '') {
        return;
      }

      let isRoot = extName[1] === ':' || extName[0] === '/';

      if (extName.indexOf("\\") >= 0 || extName.indexOf("/") >= 0) {
        if (!isRoot) {
          return;
        }
      }

      let filename = extName;
      let module;
      let ext;
      // 如果非Windows或Linux根路径则是相对路径的扩展名
      if (!isRoot) {
        let sPath = this.data.route['getSubPath'](this.ctx);
        if (sPath !== '') {
          sPath += "/";
        }

        module = sPath + this.data.json['module'] + "." + extName;
        ext = extName;
        filename = this.data.rootPath + module;
      }

      if (!fs.existsSync(filename)) {
        return;
      }

      let statSync = fs.statSync(filename);
      if (!statSync.isFile()) {
        return;
      }

      let buffer = fs.readFileSync(filename);

      if (isFile) {
        return [filename, module, buffer, ext];
      }

      return buffer;
    },

    /**
     * 获取文件路径
     * @param {*} path 
     * @param {*} rootPath 
     * @returns 
     */
    path: (path = '', rootPath = '') => {
      if (path === undefined || path.constructor.name !== 'String') {
        return rootPath;
      }

      path = path.replace(/[\\]/g, "/");
  
      let pathSplit = path.split("/");
      let pathNew = [];
      for (const i in pathSplit) {
        let iv = pathSplit[i];
        if (iv.trim() === '' || iv === '..') {
          continue;
        }
        pathNew.push(iv);
      }
      
      let subPath = pathNew.join("/");
      if (subPath !== '') {
        subPath = "/" + subPath;
      }

      return `${rootPath}${subPath}`;
    }
  };

  /**
   * 初始化
   * @param {*} ctx 
   * @param {*} json 配置信息
   * @param {*} view 视图初始化
   */
  constructor(ctx, json, view) {
    this.ctx = ctx;
    this.data.json = json;
    if (view instanceof Object) {
      this.view(view);
    }
  }

  /**
   * 判断是否是POST提交
   * @returns 
   */
  isPost() {
    if (this.ctx.app.info.body === undefined || this.ctx.app.info.body === "") {
      return false;
    }

    return true;
  }

  /**
   * 视图设置
   * @param {*} key 字符串类型或二维数组类型
   * @param {*} value 
   * @returns 
   */
  view(key, value = '') {
    if (key instanceof Array) {
      return;
    }

    let toKey = typeof key;
    if (toKey === 'string') {
      if (key !== '') {
        this.data.view[key] = value;
      }
      return;
    } else if (toKey !== 'object') {
      return;
    }

    for (const i in key) {
      if (typeof i === 'string' && i !== '') {
        this.data.view[i] = key[i];
      }
    }
  }

  /**
   * 获取视图
   * @returns 
   */
  getView(keyName = undefined) {
    if (keyName === undefined || typeof keyName !== 'string') {
      return this.data.view;
    }

    return this.data.view[keyName];
  }

  /**
   * 设置标题
   * @param {*} data 
   */
  title(data = '') {
    this.hd.setJson('title', data);
  }

  /**
   * 获取标题
   * @param {*} def 
   */
  getTitle(def = undefined) {
    return this.hd.getJson('title', def);
  }

  /**
   * 设置关键词
   * @param {*} data 
   */
  keywords(data = '') {
    this.hd.setJson('keywords', data);
  }

  /**
   * 获取关键词
   * @param {*} def 
   */
  getKeywords(def = undefined) {
    return this.hd.getJson('keywords', def);
  }

  /**
   * 设置描述
   * @param {*} data 
   */
  description(data = '') {
    this.hd.setJson('description', data);
  }

  /**
   * 获取描述
   * @param {*} def 
   */
  getDescription(def = undefined) {
    return this.hd.getJson('description', def);
  }

  /**
   * CSS 代码设置
   * @param {*} code 
   * @returns 
   */
  style(code = '') {
    if (code === undefined || typeof code !== 'string' || code.trim() === '') {
      return;
    }

    this.data.code.style.push(code);
  }

  /**
   * JS 代码设置
   * @param {*} code 
   * @param {*} isTop 
   * @returns 
   */
  script(code = '', isTop = false) {
    if (code === undefined || typeof code !== 'string' || code.trim() === '') {
      return;
    }

    this.data.code.script.push({
      code: code,
      isTop: isTop
    });
  }

  /**
   * 加载CSS文件
   * @param {*} config 
   */
  css(config = '') {
    this.hd.setStatic(config);
  }

  /**
   * 加载JS文件
   * @param {*} config 
   */
  js(config = '') {
    this.hd.setStatic(config, 'js');
  }

  /**
   * 获取项目文件路径
   * @param {*} path 
   * @returns 
   */
  path(path = '') {
    return this.hd.path(path, this.data.route['path']);
  }

  /**
   * 获取视图文件路径
   * @param {*} path 
   * @returns 
   */
  viewPath(path = '') {
    let isRoot = false;
    if (typeof path === 'string') {
      path = path.replace(/\s/g, "");
      if (path[0] === '@') {
        isRoot = true;
        path = path.substring(1);
      }
    } else {
      path = '';
    }

    let rpLen = this.data.rootPath.length;
    let sPath = "";
    if (!isRoot) {
      sPath = this.data.route['getSubPath'](this.ctx);
      if (sPath !== '') {
        sPath = "/" + sPath;
      }
    }

    return this.hd.path(path, this.data.rootPath.substring(0, rpLen - 1) + sPath);
  }

  /**
   * 页面缓存设置
   * @param {*} age 
   * @returns 
   */
  age(age = undefined) {
    if (age === undefined) {
      age = this.data.maxAge;
    } else if (typeof age !== 'number') {
      return;
    }
    this.ctx.set(
      {
        'Cache-Control': 'max-age=' + age,
      }
    );
  }

  /**
   * 读取扩展文件
   * @param {*} extName 
   * @returns 
   */
  read(extName = undefined) {
    return this.hd.read(extName);
  }

  /**
   * 获取文件文本并传值
   * @param {*} viewData 
   * @param {*} extName 
   * @returns 
   */
  async render(viewData = {}, extName = undefined) {
    let readInfo = this.hd.read(extName, true);
    if (readInfo === undefined) {
      return readInfo;
    }

    let [filename, module, read, ext] = readInfo;

    let route = this.data.route;

    let text = read.toString();

    if (viewData === undefined || viewData.constructor.name !== 'Object') {
      viewData = {};
    }

    if (!route['isRender']) {
      let nunjucks = route['nunjucks'];
      if (module === undefined) {
        return await nunjucks.renderString(text, viewData);
      }
      return await nunjucks.render(module, viewData);
    }

    let sPath = route['getSubPath'](this.ctx);
    if (sPath !== '') {
      sPath += "/";
    }

    try {
      return await route['render'](text, viewData, {
        dir: this.data.json['module'],
        path: sPath + route['view'].path,
        ext: ext,
        cache: this.data.cache,
        filename: filename,
        handle: this,
      });
    } catch (e) {
      return e.message;
    }
  }

  /**
   * 模板调用
   * @param {*} url 
   * @param {*} view 
   * @returns 
   */
  async call(url = '', view = undefined) {
    // 访问次数控制，防止死循环
    this.ctx.app.viewCount ++;
    if (this.ctx.app.viewCount > 100) {
      this.ctx.body = "Error: Too many requests";
      this.ctx.response.status = 500;
      return;
    }

    let ret = await this.ctx.app.call(url, view, this.data.ctxDir);
    // 请求完释放数量
    this.ctx.app.viewCount --;
    return ret;
  }

  /**
   * Http 单个请求
   * @param {*} config 
   * @param {*} returnConfig 
   * @returns 
   */
  async http(config = {}, returnConfig = false) {
    let [ret] = await HandleHttp.getAll([config], this.ctx, returnConfig);
    return ret;
  }

  /**
   * Http 并行请求
   * @param {*} configs 
   * @param {*} returnConfig 
   * @returns 
   */
  async httpAll(configs = {}, returnConfig = false) {
    return await HandleHttp.getAll(configs, this.ctx, returnConfig);
  }
};

module.exports = Handle;