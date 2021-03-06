'use strict';

const fs = require("fs");
const mime = require('mime-types');
const http = require("http");
const https = require("https");
const FormData = require("form-data");
const tool = require('./tool');

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
    for (const i in urlList) {
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
    for (const i in news) {
      srcs[i] = news[i];
    }

    let retList = [];
    for (const i in srcs) {
      retList.push(i + "=" + srcs[i]);
    }

    return retList.join("&");
  }

  /**
   * 获取url链接
   * @param {*} url 
   * @param {*} proxyGet 是否GET代理
   * @param {*} ctx 
   * @param {*} isCover 
   * @returns 
   */
  static getUrl(url, proxyGet = false, ctx, isCover) {
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
      if (!['http', 'https'].includes(type)) {
        return this.getError('仅支持 http 和 https');
      }
    }

    let info = {
      url: url,
      type: type
    };

    if (!proxyGet) {
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

    let mergeParam;
    if (isCover) {
      mergeParam = this.getMergeQuery(this.getParams(urlQuery), this.getParams(cUrlQuery));
    } else {
      mergeParam = this.getMergeQuery(this.getParams(cUrlQuery), this.getParams(urlQuery));
    }

    info.url = url.substring(0, pos + 1) + mergeParam;

    return this.getSuccess(info);
  }

  /**
   * 合并JSON数据
   * @param {*} srcObj 
   * @param {*} newObj 
   * @param {*} isCover 
   */
  static mergeObject(srcObj, newObj, isCover) {
    for (const i in newObj) {
      let iv = newObj[i];
      let iSrc = srcObj[i];
      let isCv = (!isCover || iSrc === undefined);
      if (iSrc === undefined || typeof iSrc !== 'object' || typeof iv !== 'object') {
        if (isCv) {
          srcObj[i] = iv;
        }
        continue;
      }

      let ivIsArray = iv instanceof Array;
      let iSrcIsArray = iSrc instanceof Array;
      if (ivIsArray) {
        if (iSrcIsArray) {
          for (const j in iv) {
            iSrc.push(iv[j]);
          }
        } else if (isCv) {
          srcObj[i] = iv;
        }
      } else if (iSrcIsArray) {
        if (isCv) {
          srcObj[i] = iv;
        }
      } else {
        this.mergeObject(iSrc, iv, isCover);
      }
    }
  }

  /**
   * 获取文件
   * @param {*} files 
   * @param {*} fileMaxSize 
   * @returns 
   */
  static async getFiles(files, fileMaxSize) {
    let retFiles = {};
    if (typeof files !== 'object' || files instanceof Array) {
      return retFiles;
    }

    for (const i in files) {
      let iv = files[i];
      let ivType = tool.type(iv);

      if (ivType === "Null") {
        continue;
      }

      let ivInfo;
      let ivPath;

      if (ivType === 'Object') {
        if (iv.path === undefined) {
          let ivDataType = tool.type(iv.data);
          if (iv.type !== 'Buffer' || ivDataType === "Null") {
            continue;
          }

          if (ivDataType !== 'Array') {
            continue;
          }
          ivInfo = iv;
          iv.path = Buffer.from(iv.data);
          delete iv.data;
          ivPath = iv.path;
        } else {
          ivInfo = iv;
          ivPath = iv.path;
        }
      } else if (ivType === 'String') {
        ivInfo = {};
        ivPath = iv;
      } else {
        continue;
      }

      let ivPathType = tool.type(ivPath);

      if (ivPathType === "Null") {
        continue;
      }

      if (ivPathType === 'String') {
        ivPath = ivPath.trim();
        if (fs.existsSync(ivPath) && fs.statSync(ivPath).isFile()) {
          ivInfo['path'] = fs.createReadStream(ivPath, {highWaterMark: fileMaxSize});
        } else {
          continue;
        }
      } else if (ivPathType !== 'Buffer') {
        continue;
      }
      
      retFiles[i] = ivInfo;
    }

    for (const i in retFiles) {
      let iv = retFiles[i];
      if (tool.type(iv.path) !== 'ReadStream') {
        continue;
      }

      let ivPath = iv.path.path;
      if (iv['type'] === undefined) {
        let ivType = mime.lookup(ivPath);
        if (ivType !== false) {
          iv['type'] = ivType;
        }
      }
      if (iv['name'] === undefined) {
        let pos = ivPath.replace(/[\\]/g, "/").lastIndexOf("/");
        if (pos >= 0) {
          iv['name'] = ivPath.substring(pos + 1);
        } else {
          iv['name'] = ivPath;
        }
      }
    }

    return retFiles;
  }

  /**
   * 设置提交数据
   * @param {*} config 
   * @param {*} isCover 
   * @param {*} cData 
   * @param {*} cFiles 
   * @returns 
   */
  static async setPostData(config, isCover, cData = {}, cFiles = {}) {
    if (!['form', 'xform', 'json'].includes(config.type)) {
      return;
    }

    let cType = config.type;

    if (cType === 'form') {
      let fileMaxSize = config.fileMaxSize;
      if (fileMaxSize === undefined || typeof fileMaxSize !== 'number' || fileMaxSize <= 0) {
        fileMaxSize = 10 * 1024 * 1024; // 默认最大传输 10M
      }
      let files = JSON.parse(JSON.stringify(cFiles));
      let confFiles = await this.getFiles(config.files, fileMaxSize);
      for (const i in confFiles) {
        if (!isCover || files[i] === undefined) {
          files[i] = confFiles[i];
        }
      }
      
      for (const i in files) {
        let iv = files[i];
        let ivPath = iv.path;
        if (typeof ivPath === 'string') {
          files[i]['path'] = fs.createReadStream(ivPath, {highWaterMark: fileMaxSize});
        }
      }
      config['files'] = files;
    }

    if (typeof cData !== 'object') {
      return;
    }

    let isArray = cData instanceof Array;
    if (isArray) {
      // form 和 xform 不支持 Array
      if (cData.length <= 0 || cType !== 'json') {
        return;
      }
    } else if (Object.keys(cData).length <= 0) {
      return;
    }

    let newData = JSON.parse(JSON.stringify(cData));
    let confData = config.data;
    if (confData === undefined || typeof confData !== 'object') {
      config['data'] = newData;
      return;
    }

    let cdIsArray = confData instanceof Array;
    if (cType === 'json') {
      if (isArray !== cdIsArray) {
        if (!isCover || config['data'] === undefined) {
          config['data'] = newData;
        }
        return;
      }

      if (isArray) {
        for (const i in confData) {
          newData.push(confData[i]);
        }
      } else {
        this.mergeObject(newData, confData, isCover);
      }
      config['data'] = newData;
      return;
    } else if (cdIsArray) {
      config['data'] = {};
      confData = config.data;
    } else {
      for (let i in confData) {
        if (!isCover || newData[i] === undefined) {
          newData[i] = confData[i];
        }
      }
    }

    config['data'] = newData;
  }

  /**
   * 获取URL配置
   * @param {*} url 
   * @returns 
   */
  static httpOptions(url) {
    let ret = {};
    let pos = url.indexOf('://');
    if (pos >= 0) {
      url = url.substring(pos + 3);
    }

    pos = url.indexOf("/");
    if (pos > 0) {
      ret['host'] = url.substring(0, pos);
      url = url.substring(pos);
    } else {
      pos = url.indexOf("?");
      if (pos > 0) {
        ret['host'] = url.substring(0, pos);
        url = url.substring(pos);
      } else {
        pos = url.indexOf("#");
        if (pos > 0) {
          ret['host'] = url.substring(0, pos);
          url = url.substring(pos);
        } else {
          ret['host'] = url;
          url = '';
        }
      }
    }

    pos = ret.host.indexOf(":");
    if (pos > 0) {
      ret['port'] = ret.host.substring(pos + 1);
      ret['host'] = ret.host.substring(0, pos);
    }

    ret['path'] = url;

    return ret;
  }

  /**
   * 获取页面数据
   * @param {*} index 
   * @param {*} config 
   * @returns 
   */
  static async httpSend(index, config) {
    let cType = config.type;
    let cData = config.data;
    let cMethod = config.method;
    if (cData === undefined) {
      cData = {};
    }

    let options = this.httpOptions(config.url);
    if (config.timeout !== undefined && typeof config.timeout === 'number' && config.timeout >= 0) {
      options['timeout'] = config.timeout;
    } else {
      options['timeout'] = 15000; // 默认超时15秒
    }
    if (tool.type(options['headers']) === 'Object') {
      options['headers'] = config.header;
    } else {
      options['headers'] = {};
    }

    if (tool.type(cMethod) === 'String') {
      cMethod = cMethod.trim().toLocaleUpperCase();
      if (cMethod !== '' && http.METHODS.includes(cMethod)) {
        options['method'] = cMethod;
      }
    }

    let cDataLen = Object.keys(cData).length;
    let isPost = false;
    let form;
    let content = '';
    if (cType === 'form') {
      let files = config.files;
      let filesLen = Object.keys(files).length;
      if (filesLen + cDataLen > 0 ) {
        isPost = true;
        form = new FormData();
        // files 文件优先设置
        for (const i in cData) {
          if (files[i] !== undefined) {
            continue;
          }

          let iv = cData[i];
          if (typeof iv === 'object') {
            iv = JSON.stringify(iv);
          }
          form.append(i, iv);
        }

        if (files !== undefined) {
          for (const i in files) {
            let iv = files[i];
            let ivPath = iv.path;
            let ivConfig = {};
            if (iv.name !== undefined) {
              ivConfig['filename'] = iv.name;
            }
            if (iv.type !== undefined) {
              ivConfig['contentType'] = iv.type;
            }
            form.append(i, ivPath, ivConfig);
          }
        }

        let fHeaders = form.getHeaders();
        for (const i in fHeaders) {
          options['headers'][i] = fHeaders[i];
        }
      }
    } else if (cDataLen > 0) {
      if (cType === 'xform') {
        options['headers']['content-type'] = 'application/x-www-form-urlencoded';
        let cDataList = [];
        for (const i in cData) {
          cDataList.push(i + "=" + cData[i]);
        }
        content = encodeURI(cDataList.join('&'));
      } else if (cType === 'json') {
        options['headers']['content-type'] = 'application/json; charset=utf-8';
        content = JSON.stringify(cData);
      }

      if (content.length > 0) {
        isPost = true;
        options['headers']['content-length'] = content.length;
      }
    }

    if (isPost && options['method'] === undefined) {
      options['method'] = 'POST';
    }

    let urlType = config.urlType;
    let dataType = config.dataType;
    let cBuffer = config.buffer;
    let sTime = Date.now();
    let debug = config.debug;
    let isDebug = false;
    let isAsync = false;
    let dcn = tool.type(debug);
    if (dcn === 'AsyncFunction') {
      isDebug = true;
      isAsync = true;
    } else if (dcn === 'Function') {
      isDebug = true;
    }

    return new Promise( async resolve => {
      let _resolve = async data => {
        if (isDebug) {
          if (isAsync) {
            await debug(index, data);
          } else {
            debug(index, data);
          }
        }

        resolve(data);
      };

      let callback = async res => {
        let bodyData = [];
        res.on("data", async (data) => {
          bodyData.push(data);
        }).on("end", async () => {
          let bd = Buffer.concat(bodyData);
          let bdIsString = false;
          if (cBuffer === true) {
            if (dataType === 'json') {
              bdIsString = true;
            }
          } else {
            bdIsString = true;
          }

          if (bdIsString) {
            bd = bd.toString();
          }

          let rh = res.rawHeaders;
          let rHead = {};
          if (rh !== undefined) {
            for (let i = 0; i < rh.length; i += 2) {
              rHead[rh[i]] = rh[i + 1];
            }
          }

          await _resolve({
            status: true,
            code: res.statusCode,
            data: bd,
            headers: rHead,
            ms: Date.now() - sTime
          });
        });
      }

      let request;
      if (urlType === 'http') {
        request = http.request(options, callback);
      } else {
        request = https.request(options, callback);
      }

      let isEnd = false;
      if (isPost) {
        if (cType === 'form') {
          form.pipe(request);
          isEnd = true;
        } else {
          request.write(content);
        }
      }

      request.on("error", async e => {
        // 超时处理
        if (e.code === 'ECONNRESET' && e.message === 'socket hang up') {
          return;
        }

        await _resolve({
          status: false,
          code: e.code,
          data: e.message,
          ms: Date.now() - sTime
        });
      }).on("timeout", async e => {
        await _resolve({
          status: false,
          code: 500,
          data: 'timeout',
          ms: Date.now() - sTime
        });
        
        request.destroy();
      });

      // 防止 form-data 报错 write after end
      if (!isEnd) {
        request.end();
      }
    });
  }

  /**
   * 获取 Promise 结构
   * @param {*} srcConfig 
   * @param {*} ctx 
   * @returns 
   */
  static async getConfig(srcConfig, ctx) {
    if (tool.type(srcConfig) !== 'Object') {
      return this.getError('Config Is Error!');
    }

    let proxyGet = false;
    let proxyPost = false;
    let proxyHeader = false;
    let proxyMethod = false;
    let proxy = srcConfig.proxy;
    if (typeof proxy !== 'object' || proxy instanceof Array) {
      proxy = {};
    }

    // 全局设置
    if (proxy.all === true) {
      let pList = ['get', 'post', 'header', 'method'];
      for (const i in pList) {
        const iv = pList[i];
        if (proxy[iv] === undefined) {
          proxy[iv] = true;
        }
      }
    }

    if (typeof proxy.get === 'boolean') {
      proxyGet = proxy.get;
    }

    if (typeof proxy.post === 'boolean') {
      proxyPost = proxy.post;
    }

    if (typeof proxy.header === 'boolean') {
      proxyHeader = proxy.header;
    }

    if (typeof proxy.method === 'boolean') {
      proxyMethod = proxy.method;
    }

    // 数据覆盖模式 asc: POST覆盖配置， desc: 配置覆盖POST， 默认 asc
    let isCover = true;
    if (typeof srcConfig.proxyCover === 'string') {
      if (srcConfig['proxyCover'].trim().toLocaleLowerCase() === 'desc') {
        isCover = false;
      }
    }

    let { status, data: url } = this.getUrl(srcConfig.url, proxyGet, ctx, isCover);
    if (!status) {
      return this.getError(url);
    }

    let config = JSON.parse(JSON.stringify(srcConfig));
    for (const i in srcConfig) {
      let iv = srcConfig[i];
      if (iv !== undefined && typeof iv === 'function') {
        config[i] = iv;
      }
    }

    config.url = url.url;
    config['urlType'] = url.type;
    
    // 数据返回类型仅支持文本格式类型和JSON类型
    if (config.dataType === undefined || typeof config.dataType !== 'string') {
      config.dataType = 'full';
    } else {
      config.dataType = config.dataType.trim().toLocaleLowerCase();
      if (!['json', 'text'].includes(config.dataType)) {
        config.dataType = 'full';
      }
    }

    if (typeof config.type === 'string') {
      config['type'] = config.type.trim().toLocaleLowerCase();
    } else {
      config['type'] = ctx.app.info.type;
    }

    if (config.type !== 'form') {
      delete config['files'];
    }

    if (proxyPost) {
      await this.setPostData(config, isCover, ctx.app.info.data, ctx.app.info.files);
    } else {
      await this.setPostData(config, isCover);
    }

    // 对象字符化
    if (['form', 'xform'].includes(config.type) && typeof config.data === 'object') {
      for (const i in config.data) {
        let iv = config.data[i];
        if (typeof iv === 'object') {
          config.data[i] = JSON.stringify(iv);
        } else {
          config.data[i] = iv;
        }
      }
    }

    if (proxyHeader) {
      let ctxHeader = JSON.parse(JSON.stringify(ctx.header));
      // 删除影响部分
      let hDeltes = ['host', 'referer', 'content-length', 'transfer-encoding', 'content-type'];
      for (const i in hDeltes) {
        delete ctxHeader[hDeltes[i]];
      }
      if (tool.type(config.header) === 'Object') {
        for (const i in config.header) {
          let iv = config.header[i];
          if (typeof iv === 'string') {
            let iLower = i.toLocaleLowerCase();
            if (!isCover || ctxHeader[iLower] === undefined) {
              ctxHeader[iLower] = iv;
            }
          }
        }
      }
      config['header'] = ctxHeader;
    }

    if (proxyMethod && config.method === undefined && ctx.method !== undefined) {
      config['method'] = ctx.method;
    }

    return this.getSuccess(config);
  }

  /**
   * 批量获取页面数据
   * @param {*} configs 
   * @param {*} ctx 
   * @param {*} returnConfig 
   * @returns 
   */
  static async getAll(configs, ctx, returnConfig) {
    let cType = tool.type(configs);

    if (cType === "Null") {
      return undefined;
    }

    if (!['Object', 'Array'].includes(cType)) {
      return configs;
    }

    for (const i in configs) {
      configs[i] = await this.getConfig(configs[i], ctx);
    }
    
    // 返回配置信息
    if (returnConfig) {
      return configs;
    }

    let promiseList = [];
    let keys = [];
    for (const i in configs) {
      keys.push(i);
      let iv = configs[i];
      if (!iv.status) {
        promiseList.push(async () => iv);
        continue;
      }

      promiseList.push(this.httpSend(i, iv.data));
    }

    // 异步处理
    let result = await Promise.all(promiseList);

    // 数据处理
    for (const i in result) {
      let conf = configs[keys[i]];
      if (!conf.status) {
        continue;
      }

      let iv = result[i];
      let dType = conf.data.dataType;
      if (dType === 'full') {
        continue;
      } else if (dType === 'text') {
        result[i] = iv.data;
        continue;
      }

      if (!iv.status) {
        continue;
      }

      try {
        result[i] = JSON.parse(iv.data);
      } catch (e) {
        result[i] = {};
      }
    }

    // 返回列表模式
    if (cType === 'Array') {
      return result;
    }

    // 返回对象模式
    let resultObject = {};
    for (const i in result) {
      resultObject[keys[i]] = result[i];
    }

    return resultObject;
  }

  /**
   * 获取页面数据
   * @param {*} config 
   * @param {*} ctx 
   * @param {*} returnConfig 
   * @returns 
   */
  static async get(config, ctx, returnConfig) {
    let [ret] = await this.getAll([config], ctx, returnConfig);
    
    return ret;
  }
}

module.exports = HandleHttp;