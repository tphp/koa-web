'use strict';

const http = require("http");
const https = require("https");

/**
 * Http请求
 */
class HandleHttp {
  /**
   * 返回数据
   * @returns 
   */
  static getReturn() {
    return {
      status: this.status,
      data: this.data
    };
  }

  /**
   * 返回错误信息
   * @param {*} data 
   * @returns 
   */
  static getError(data) {
    return {
      status: true,
      data: data
    };
  }

  /**
   * 返回成功信息
   * @param {*} data 
   * @returns 
   */
  static getSuccess(data) {
    return {
      status: true,
      data: data
    };
  }

  /**
   * 获取url链接
   */
  static getUrl(url, isGet = false, ctx) {
    if (url === undefined || typeof url !== 'string') {
      return this.getError('url未设置');
    }

    url = url.trim();
    if (url === '') {
      return this.getError('url未设置');
    }

    let pos = url.indexOf("://");
    if (pos <= 0) {
      return this.getError('url格式有误');
    }
    let type = url.substring(0, pos).toLocaleLowerCase();
    if (!['http', 'https'].indexOf(type)) {
      return this.getError('url格式有误');
    }

    let info = {
      url: url,
      type: type
    };

    console.log(isGet);
    if (!isGet) {
      return this.getSuccess(info);
    }

    return this.getSuccess(info);
  }

  static async get(config, ctx) {
    if (!(config instanceof Object && !(config instanceof Array))) {
      return this.getError('Config Is Error!');
    }

    let isGet = false;
    let cIs = config.is;
    if (typeof cIs !== 'object' || cIs instanceof Array) {
      cIs = {};
    }

    if (typeof cIs.get === 'boolean') {
      isGet = cIs.get;
    }

    let {status, data: url} = this.getUrl(config.url, isGet, ctx);
    if (!status) {
      return this.getError(url);
    }

    console.log(status, url);
  }


}

module.exports = HandleHttp;