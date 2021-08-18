'use strict';

const http = require("http");
const https = require("https");
const formidable = require("formidable");

/**
 * Http请求
 */
class HandleHttp {

  /**
   * 返回错误信息
   * @param {*} data 
   * @returns 
   */
  static getError(data) {
    return {
      status: false,
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
   * 获取URL参数
   * @param {*} url 
   * @returns 
   */
  static getParams(url) {
    let urlList = url.split("&");
    let ret = {};
    for (let i in urlList) {
      let iv = urlList[i];
      let pos = iv.indexOf("=");
      if (pos <= 0) {
        continue;
      }

      let v = iv.substring(pos + 1);
      if (v === '') {
        continue;
      }

      ret[iv.substring(0, pos)] = v;
    }

    return ret;
  }

  /**
   * 合并参数
   * @param {*} srcs 
   * @param {*} news 
   * @returns 
   */
  static getMergeQuery(srcs, news) {
    for (let i in news) {
      srcs[i] = news[i];
    }

    let retList = [];
    for (let i in srcs) {
      retList.push(i + "=" + srcs[i]);
    }

    return retList.join("&");
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

    let type = 'http';
    let pos = url.indexOf("://");
    if (pos <= 0) {
      url = "http://" + url;
    } else {
      type = url.substring(0, pos).toLocaleLowerCase();
      if (['http', 'https'].indexOf(type) < 0) {
        return this.getError('仅支持 http 和 https');
      }
    }

    let info = {
      url: url,
      type: type
    };

    if (!isGet) {
      return this.getSuccess(info);
    }

    pos = ctx.url.indexOf("?");
    if (pos < 0) {
      return this.getSuccess(info);
    }

    let cUrlQuery = ctx.url.substring(pos + 1);

    pos = url.indexOf("?");
    if (pos < 0) {
      info.url = url + "?" + cUrlQuery;
      return this.getSuccess(info);
    }

    let urlQuery = url.substring(pos + 1);

    let mergeParam = this.getMergeQuery(this.getParams(urlQuery), this.getParams(cUrlQuery));

    info.url = url.substring(0, pos + 1) + mergeParam;

    return this.getSuccess(info);
  }

  static async setPostData(config, ctx) {
    // let { status, info } = await this.getPostData(ctx);
    // if (!status) {
    //   return;
    // }

    // console.log(info);
    // console.log(ctx.header);
    // let form = new multiparty.Form()
    // form.parse(ctx, (err, fields, files) => {
    //     console.log(fields, files)
    // })


    // console.log(postData);
    // console.log(ctx.file);
  }

  static async get(config, ctx) {
    if (!(config instanceof Object && !(config instanceof Array))) {
      return this.getError('Config Is Error!');
    }

    let isGet = false;
    let isPost = false;
    let cIs = config.is;
    if (typeof cIs !== 'object' || cIs instanceof Array) {
      cIs = {};
    }

    if (typeof cIs.get === 'boolean') {
      isGet = cIs.get;
    }

    if (typeof cIs.post === 'boolean') {
      isPost = cIs.post;
    }

    let { status, data: url } = this.getUrl(config.url, isGet, ctx);
    if (!status) {
      return this.getError(url);
    }

    if (!isPost) {
      await this.setPostData(config, ctx);
    }



    console.log(status, url);
  }


}

module.exports = HandleHttp;