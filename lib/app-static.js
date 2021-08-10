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
    var title = json.title;
    var keywords = json.keywords;
    var description = json.description;
    var isSeo = true;
    if (
      title === undefined && typeof title !== 'string' &&
      keywords === undefined && typeof keywords !== 'string' &&
      description === undefined && typeof description !== 'string'
    ) {
      if (top === '') {
        isSeo = false;
        return body;
      }
    }

    var bodyLower = body.toLocaleLowerCase();

    var hLStr = "<head>";
    var hRStr = "</head>";
    var headLeft = bodyLower.indexOf(hLStr);
    var headRight = bodyLower.indexOf(hRStr);

    if (headLeft < 0 || headRight < 0 || headLeft > headRight) {
      if (top === '') {
        return body;
      }

      return top + "\n" + body;
    }

    headLeft += hLStr.length;

    var bodyLeft = body.substring(0, headLeft);
    var bodyHead = body.substring(headLeft, headRight);
    var bodyRight = body.substring(headRight);
    
    var bodyHeadLower = bodyHead.toLocaleLowerCase();
    var tLStr = "<title>";
    var tRStr = "</title>";
    if (title !== undefined && typeof title === 'string') {
      var tText = tLStr + title + tRStr;
      var titleLeft = bodyHeadLower.indexOf(tLStr);
      var titleRight = bodyHeadLower.indexOf(tRStr);
      if (titleLeft < 0 || titleRight < 0 || titleLeft > titleRight) {
        bodyHead = "\n  " + tText + bodyHead;
      } else {
        bodyHead = bodyHead.substring(0, titleLeft + tLStr.length) + title + bodyHead.substring(titleRight);
      }
    }

    var kd = [];
    if (keywords !== undefined && typeof keywords === 'string') {
      kd.push('keywords');
    }
    if (description !== undefined && typeof description === 'string') {
      kd.push('description');
    }

    var kdHas = {};

    if (kd.length > 0) {
      var headSplit = bodyHead.split("<");
      for (var i in headSplit) {
        var iv = headSplit[i];
        var ivLower = iv.toLocaleLowerCase();
        if (ivLower.indexOf('meta') !== 0) {
          continue;
        }

        var endPos = ivLower.indexOf('>');
        if (endPos < 0) {
          continue;
        }
        
        ivLower = ivLower.replace(/= /g, '=').replace(/ =/g, '=').replace(/[']/g, '').replace(/["]/g, '');
        for (var j in kd) {
          var jv = kd[j];
          if (ivLower.indexOf("name=" + jv) > 0) {
            headSplit[i] = "meta name=\"" + jv + "\" content=\"" + json[jv] + "\" />" + iv.substring(endPos + 1);
            kdHas[jv] = true;
            break;
          }
        }
      }

      bodyHead = headSplit.join("<");

      var nosetList = [];
      for (var j in kd) {
        var jv = kd[j];
        if (kdHas[jv]) {
          continue;
        }
        nosetList.push("  <meta name=\"" + jv + "\" content=\"" + json[jv] + "\" />");
      }

      if (nosetList.length > 0) {
        bodyHeadLower = bodyHead.toLocaleLowerCase();
        var titlePos = bodyHeadLower.indexOf(tRStr);
        var noset = nosetList.join("\n");
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

    var bodyLower = body.toLocaleLowerCase();
    var bodyPos = bodyLower.lastIndexOf("</body>");
    if (bodyPos < 0) {
      return body;
    }

    return body.substring(0, bodyPos) + bottom + "\n" + body.substring(bodyPos);
  }

  /**
   * 获取静态文件
   * @param {*} json 
   * @returns 
   */
  static getStatic(json, code) {
    var sTops = [];
    var sBottoms = [];
    var css = json.css;
    if (css !== undefined && css instanceof Object) {
      for (var c in css) {
        sTops.push("  <link rel=\"stylesheet\" href=\"" + c + "\" />");
      }
    }
    var js = json.js;
    if (js !== undefined && js instanceof Object) {
      for (var j in js) {
        var jv = "<script src=\"" + j + "\"></script>";
        if (js[j]) {
          sTops.push("  " + jv);
        } else {
          sBottoms.push(jv);
        }
      }
    }

    // CSS代码
    var codeStyle = code.style;
    if (codeStyle.length > 0) {
      var styles = [];
      for (var i in codeStyle) {
        var iv = codeStyle[i].split("\n");
        for (var j in iv) {
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
    var codeScript = code.script;
    if (codeScript.length > 0) {
      var bTops = [];
      var bBottoms = [];
      for (var i in codeScript) {
        var iv = codeScript[i].code.split("\n");
        if (codeScript[i].isTop) {
          for (var j in iv) {
            bTops.push("    " + iv[j]);
          }
        } else {
          for (var j in iv) {
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
    var stt = this.getStatic(json, code);
    body = this.getSeo(body, json, stt.top);
    body = this.getScript(body, stt.bottom);
    return body;
  }
}

module.exports = AppStatic;