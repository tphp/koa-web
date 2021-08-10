'use strict';

/**
 * 工具类
 */

class Handle {
  ctx;
  next;

  data = {
    view: {},
    json: {},
    code: {
      style: [],
      script: []
    }
  }

  /**
   * 初始化
   * @param {*} ctx 
   * @param {*} next 
   * @param {*} json 配置信息
   */
  constructor(ctx, next, json) {
    this.ctx = ctx;
    this.next = next;
    this.data.json = json;
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

    var toKey = typeof key;
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
   * 设置JSON数据
   * @param {*} key 
   * @param {*} data 
   */
  __setJson(key, data) {
    this.data.json[key] = data;
  }

  /**
   * 获取JSON数据
   * @param {*} key 
   * @param {*} def 
   * @returns 
   */
  __getJson(key, def = undefined) {
    if (this.data.json[key] === undefined) {
      return def;
    }

    return this.data.json[key];
  }

  __setStatic(config, type = 'css') {
    if (config === undefined) {
      return;
    }

    var sets = [];
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
  }

  /**
   * 设置标题
   * @param {*} data 
   */
  title(data = '') {
    this.__setJson('title', data);
  }

  /**
   * 获取标题
   * @param {*} def 
   */
  getTitle(def = undefined) {
    return this.__getJson('title', def);
  }

  /**
   * 设置关键词
   * @param {*} data 
   */
  keywords(data = '') {
    this.__setJson('keywords', data);
  }

  /**
   * 获取关键词
   * @param {*} def 
   */
  getKeywords(def = undefined) {
    return this.__getJson('keywords', def);
  }

  /**
   * 设置描述
   * @param {*} data 
   */
  description(data = '') {
    this.__setJson('description', data);
  }

  /**
   * 获取描述
   * @param {*} def 
   */
  getDescription(def = undefined) {
    return this.__getJson('description', def);
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
    this.__setStatic(config);
  }

  /**
   * 加载JS文件
   * @param {*} config 
   */
  js(config = '') {
    this.__setStatic(config, 'js');
  }
};

module.exports = Handle;