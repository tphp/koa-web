'use strict';

/**
 * 静态文件重写
 */
class AppStatic {

  /**
   * 设置TDK
   * @param {*} body 
   * @param {*} json 
   * @param {*} top 
   * @returns 
   */
  static getSeo(body, json, top) {
    let title = json.title;
    let keywords = json.keywords;
    let description = json.description;
    if (
      title === undefined && typeof title !== 'string' &&
      keywords === undefined && typeof keywords !== 'string' &&
      description === undefined && typeof description !== 'string'
    ) {
      if (top === '') {
        return body;
      }
    }

    let bodyLower = body.toLocaleLowerCase();

    let hLStr = "<head>";
    let hRStr = "</head>";
    let headLeft = bodyLower.indexOf(hLStr);
    let headRight = bodyLower.indexOf(hRStr);

    if (headLeft < 0 || headRight < 0 || headLeft > headRight) {
      if (top === '') {
        return body;
      }

      return top.replace(/(\s\s\<)/g, '<') + "\n" + body;
    }

    headLeft += hLStr.length;

    let bodyLeft = body.substring(0, headLeft);
    let bodyHead = body.substring(headLeft, headRight);
    let bodyRight = body.substring(headRight);
    
    let bodyHeadLower = bodyHead.toLocaleLowerCase();
    let tLStr = "<title>";
    let tRStr = "</title>";
    if (title !== undefined && typeof title === 'string') {
      let tText = tLStr + title + tRStr;
      let titleLeft = bodyHeadLower.indexOf(tLStr);
      let titleRight = bodyHeadLower.indexOf(tRStr);
      if (titleLeft < 0 || titleRight < 0 || titleLeft > titleRight) {
        bodyHead = "\n  " + tText + bodyHead;
      } else {
        bodyHead = bodyHead.substring(0, titleLeft + tLStr.length) + title + bodyHead.substring(titleRight);
      }
    }

    let kd = [];
    if (keywords !== undefined && typeof keywords === 'string') {
      kd.push('keywords');
    }
    if (description !== undefined && typeof description === 'string') {
      kd.push('description');
    }

    let kdHas = {};

    if (kd.length > 0) {
      let headSplit = bodyHead.split("<");
      for (const i in headSplit) {
        let iv = headSplit[i];
        let ivLower = iv.toLocaleLowerCase();
        if (ivLower.indexOf('meta') !== 0) {
          continue;
        }

        let endPos = ivLower.indexOf('>');
        if (endPos < 0) {
          continue;
        }
        
        ivLower = ivLower.replace(/= /g, '=').replace(/ =/g, '=').replace(/[']/g, '').replace(/["]/g, '');
        for (const j in kd) {
          let jv = kd[j];
          if (ivLower.indexOf("name=" + jv) > 0) {
            headSplit[i] = "meta name=\"" + jv + "\" content=\"" + json[jv] + "\" />" + iv.substring(endPos + 1);
            kdHas[jv] = true;
            break;
          }
        }
      }

      bodyHead = headSplit.join("<");

      let nosetList = [];
      for (const j in kd) {
        let jv = kd[j];
        if (kdHas[jv]) {
          continue;
        }
        nosetList.push("  <meta name=\"" + jv + "\" content=\"" + json[jv] + "\" />");
      }

      if (nosetList.length > 0) {
        bodyHeadLower = bodyHead.toLocaleLowerCase();
        let titlePos = bodyHeadLower.indexOf(tRStr);
        let noset = nosetList.join("\n");
        if (titlePos > 0) {
          titlePos += tRStr.length;
          bodyHead = bodyHead.substring(0, titlePos) + "\n" + noset + bodyHead.substring(titlePos);
        } else {
          bodyHead = noset + "\n" + bodyHead;
        }
      }
    }

    if (top !== '') {
      bodyHead += top + "\n";
    }

    return bodyLeft + bodyHead + bodyRight;
  }

  /**
   * 设置底部JS
   * @param {*} body 
   * @param {*} bottom 
   * @returns 
   */
  static getScript(body, bottom) {
    if (bottom === '') {
      return body;
    }

    let bodyLower = body.toLocaleLowerCase();
    let bodyPos = bodyLower.lastIndexOf("</body>");
    if (bodyPos < 0) {
      return body　+ "\n" +　bottom;
    }

    return body.substring(0, bodyPos) + bottom + "\n" + body.substring(bodyPos);
  }

  /**
   * 获取静态文件
   * @param {*} json 
   * @returns 
   */
  static getStatic(json, code) {
    let sTops = [];
    let sBottoms = [];
    let css = json.css;
    if (css !== undefined && css instanceof Object) {
      for (const c in css) {
        sTops.push("  <link rel=\"stylesheet\" href=\"" + c + "\" />");
      }
    }
    let js = json.js;
    if (js !== undefined && js instanceof Object) {
      for (const j in js) {
        let jv = "<script src=\"" + j + "\"></script>";
        if (js[j]) {
          sTops.push("  " + jv);
        } else {
          sBottoms.push(jv);
        }
      }
    }

    // CSS代码
    let codeStyle = code.style;
    if (codeStyle.length > 0) {
      let styles = [];
      for (const i in codeStyle) {
        let iv = codeStyle[i].split("\n");
        for (const j in iv) {
          styles.push("    " + iv[j]);
        }
      }

      sTops.push(
        "  <style>\n" +
        styles.join("\n") +
        "\n  </style>"
      );
    }

    // JS代码
    let codeScript = code.script;
    if (codeScript.length > 0) {
      let bTops = [];
      let bBottoms = [];
      for (const i in codeScript) {
        let iv = codeScript[i].code.split("\n");
        if (codeScript[i].isTop) {
          for (const j in iv) {
            bTops.push("    " + iv[j]);
          }
        } else {
          for (const j in iv) {
            bBottoms.push("  " + iv[j]);
          }
        }
      }

      if (bTops.length > 0) {
        sTops.push(
          "  <script>\n" +
          bTops.join("\n") +
          "\n  </script>"
        );
      }

      if (bBottoms.length > 0) {
        sBottoms.push(
          "<script>\n" +
          bBottoms.join("\n") +
          "\n</script>"
        );
      }
    }

    return {
      top: sTops.join("\n"),
      bottom: sBottoms.join("\n")
    };
  }
  
  /**
   * 获取页面内容
   * @param {*} body 
   * @param {*} json 
   * @returns 
   */
  static getBody(body, json, code) {
    let stt = this.getStatic(json, code);
    let isNull = false;
    if (body === undefined) {
      body = '';
      isNull = true;
    } else {
      let bType = body.constructor.name;
      if (['Object', 'Array', 'Buffer'].includes(bType)) {
        return body;
      } else if (bType !== 'String') {
        try {
          body += "";
        } catch(e) {
          return body;
        }
      }
    }

    body = this.getSeo(body, json, stt.top);
    body = this.getScript(body, stt.bottom);

    if (isNull && body === '') {
      return;
    }
    
    return body;
  }
}

module.exports = AppStatic;