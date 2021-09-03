koa-web

- 解决WEB开发者不易发现的困惑，WEB开发原来可以这么玩。
- 可使用koa或者koa-web扩展更多的功能实现。
- 是全栈开发的桥梁，它将改变繁琐开发的习惯，让代码一目了然。

---

## 应用场景

- 开发WEB页面实时预览效果（无需重启服务）
- SEO、CSS和JS设置更轻松
- 简化GET和POST请求处理
- 也适用于API、web代理、压力测试
- 代码层次分明，开发大项目优势明显
- 域名灵活绑定路径，适合开发多项目
- 更多不确定的用途可能也会在这里 (待发现...)

#### 依赖包

- 应用框架: [koa](https://koa.bootcss.com/)
- 静态文件处理: [koa-static](https://www.npmjs.com/package/koa-static) + [koa-mount](https://www.npmjs.com/package/koa-mount)
- 模板引擎: [nunjucks](https://nunjucks.bootcss.com/) (也可设置其他模板引擎)
- 提交数据处理: [form-data](https://www.npmjs.com/package/form-data) + [formidable](https://www.npmjs.com/package/formidable)

#### 下载DEMO源码

- [koa-web-demo](https://github.com/tphp/koa-web-demo)

#### 安装 koa-web

```
npm i koa-web
```
---

## 项目配置

```js
const Koa = require("koa");
const KoaWeb = require('koa-web');

const app = new Koa();

app.use(
  KoaWeb(
    {
      // 项目根路径
      path: __dirname,

      // 静态文件路径组，默认指向static
      // 模式1: static: "static"
      // 模式2: static: ["static"]
      // 模式3: static: {static: "static"}
      // 模式1、2、3效果相同，如果想指定项目外目录须使用模式3
      static: {
        static: "static"
      },

      // 静态文件缓存时间，默认0毫秒
      staticMaxage: 0,

      // 视图模块设置
      view: {
        // 视图默认目录 html
        path: "html",

        // 视图文件默认扩展名 html， 如 "hello.html"
        ext: "html",

        // 域名(前缀)绑定路径设置
        domains: {
          // 如访问: http://www.hello.myweb.com:90
          // 实际解析到: myweb90/tools 目录
          // 相当于 view 中的 path 设置为: html/myweb90/tools
          // 左边: www.*.{abc}.com:{port}不能混合参数
          // 如 www.*.{abc}{def} 中的 {abc}{def} 将无法解析
          // 右边: {abc}{port}/tools 可以随意混合参数
          "www.*.{abc}.com:{port}": "{abc}{port}/tools",

          // 权重1: 域名前缀数量越多，权重越高
          // 如访问: http://www.a.com:88 将解析到 xyz
          // 如访问: http://www.b.com:88 将解析到 abc
          "www:88": "abc",
          "www.a:88": "xyz",

          // 权重2: 参数越少，权重越高
          // 如访问: http://www.a.com 将解析到 hello
          // 如访问: http://www.b.com 将解析到 world
          "www.a.com": "hello",
          "www.{name}.com": "world", // 等价于: "www.*.com": "world"

          // 绑定所有域名/IP的90端口， 但权重最低
          ":90": "path",
        
          // :90 权重高于 :{path}
          // ":{path}": "new/path",
        },

        // 默认解析路径，不支持变量设置，如: {abc}/tpl
        // 当domains中配对不成功时生效
        // 默认为空，即根目录 html
        domainDefault: ""
      },

      // 热加载，如果不缓存，每次文件改动会重新加载
      // 生产环境可设置为true提高性能
      cache: false,

      // 错误页面默认设置，只支持 404 和 500 错误
      errors: {
        404: "errors/404",
        500: "errors/500"
      },

      // json配置文件全局配置，会和视图目录中的 ".json" 文件合并
      json: {
        // js: "hello.js",
        // css: ['hello.css', 'world.css'],
        // layout: "layout/test"
      },

      // 扩展页面默认Content-Type设置，如果不设置则以mime-types扩展名为准
      // extTypes: {
      //   // 例如 /hello/world.txt 的设置 Content-Type："text/plan"
      //   txt: "text/plan"
      // },

      // 扩展页面执行后回调
      extCalls: {
        // 访问： http://localhost:3000/任意路径.sh
        // 同步模式
        // extData: 调用任意路径下的扩展页面数据
        sh: (extData, hd, data, files) => {
          // 优先级高于 extTypes 配置
          hd.ctx.type = 'text/plain';

          return extData;
        },

        // 访问： http://localhost:3000/任意路径
        // 异步模式
        // 默认页面 htm、html和无扩展
        // html: async () => {
        //   return "hello world!";
        // }
      },

      // 如果不习惯默认的nunjucks模板引擎， 可以使用render进行重设
      // template: 模板页面源码
      // viewData: 渲染的数据
      // info: 如果template不能满足要求，info中有更多信息提供使用
      // render: (template, viewData, info) => {
      //   // ****字符串模式****
      //   let ejs = require('ejs');
      //   return ejs.render(template, viewData);

      //   // *****文件模式*****
      //   let error;
      //   let html;
      //   ejs.renderFile(info.filename, viewData, (e, h) => {
      //     error = e;
      //     html = h;
      //   });

      //   if (error) {
      //     info.handle.ctx.response.status = 500;
      //     return error['message'];
      //   }
      //   return html;
      // },
    }
  )
);

// app.use(KoaWeb({path: __dirname})); // 快捷默认配置

app.listen(3000, () => {
  console.log("server is running at http://localhost:3000");
});
```
---

## 基本用法

#### 创建主页面

- 默认路径对应 view > path 配置
- 默认路径: /html 默认扩展: .html
- 新建文件/html/index.html 并填写 Hello World ！
- 访问方式(效果一样)：
  - http://localhost:3000
  - http://localhost:3000/index
  - http://localhost:3000/index.htm
  - http://localhost:3000/index.html
- 当cache=false(默认false)时不需要重启Koa服务，就可以看到实时效果

#### 静态文件

- 创建/static/test.jpg文件
- 访问路径： http://localhost:3000/static/test.jpg

#### 错误页面

- 404： /html/errors/404.html
- 500： /html/errors/500.html
- 页面中设置 {{ code }}: 错误状态码
- 页面中设置 {{ message }}: 错误消息

#### 创建页面DEMO

- 视图文件：/html/hello/world.html
- 模板文件：/html/hello/world.js
- 配置文件：/html/hello/world.json
- 这3个文件至少存在一个

###### /html/hello/world.html

```html
<div>{{ sayHello }}</div>
<div>{{ sayWorld }}</div>
```

###### 模板引擎说明文档 [nunjucks](https://nunjucks.bootcss.com/)

###### /html/hello/world.js

```js
/**
 * 入口文，hd、data和files都可以不设置
 * 如 module.exports = async () => {}; 也是可以的
 * data和files是通过 require("formidable") 实现
 * @param {*} hd 主调用函数
 * @param {*} data form-data、x-www-form-urlencoded和JSON数据会自动转化为该对象
 * @param {*} files 只有在form-data类型中产生
 * @returns 
 */
module.exports = async (hd, data, files) => {

  // hd.ctx.body = '设置了就只会显示这一段';

  // console.log(hd.isPost()); // 判断是否是POST提交
  
  // console.log(hd.ctx.query); // url 传递的参数
  // console.log(hd.ctx.header); // http 头文件
  // console.log(data); // data == hd.ctx.app.info.data
  // console.log(files); // files == hd.ctx.app.info.files

  // hd.ctx.app.info.status: 解析状态
  // hd.ctx.app.info.errMessage: 解析错误提示
  // hd.ctx.app.info.body: 原始POST提交字符串
  // hd.ctx.app.info.type: Content-Type标记 form、xform、json
  // form: multipart/form-data
  // xform: application/x-www-form-urlencoded
  // json: application/json
  // console.log(hd.ctx.app.info); 

  // 获取项目中文件路径: /项目路径/hello.js
  // console.log(hd.path("hello.js"));
  // 获取视图中文件路径: /项目路径/html/hello.js
  // console.log(hd.viewPath("hello.js"));

  // 设置模板页面中函数（nunjucks模板）
  hd.view('sayHello', "hello hello!");
  // 多函数设置
  // hd.view({sayHello: "hello hello!", sayOther: "hello other"});
  // 获取函数
  // console.log(hd.getView());
  // console.log(hd.getView('sayHello'));

  // SEO优化（TDK）
  // hd.title('页面标题');
  // console.log(hd.getTitle());
  hd.keywords('关键词');
  // console.log(hd.getKeywords());
  // hd.description('描述');
  // console.log(hd.getDescription());

  // 动态设置页面内CSS和JS
  hd.style(".body{color:#F00;}"); // style只能在head中
  hd.script("var top = 'top';", true); // js 代码在 head 中
  hd.script("var bottom = 'bottom';"); // js 代码在body标签尾部

  // 动态加载css和js文件
  // 加载css不管加不加@都在head标签中或页面顶部
  hd.css('/static/c1.css');
  hd.css(['/static/c2.css', '@/static/c3.css']);
  // 动态js中加@表示在head标签中或页面顶部
  hd.js('/static/j1.js');
  hd.js(['/static/j2.js', '@/static/j3.js']);

  // 设置页面缓存10秒
  // hd.age(10);
  // 如不设置，hd.age()， 则页面缓存默认是 staticMaxage 配置值

  return {
    sayWorld: "hello world!"
  };
}
```

###### /html/hello/world.json

- layout默认为不设置
- css和js可以是字符串或数组

```json
{
  "layout": "hello/layout",
  "css": "/static/abc.css",
  "js": [
    "/static/abc.js",
    "@/static/def.js"
  ],
  "title": "this title is json",
  "keywords": "this keywords is json",
  "description": "this description is json"
}
```

###### /html/hello/layout.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
</head>
<body>
<div>{{ sayLayout }}</div>
{{ __layout__ | safe }}
</body>
</html>
```

###### /html/hello/layout.js

```js
module.exports = async (hd) => {
  hd.view('sayLayout', "hello layout!");
}
```

---

## 页面源码效果DEMO

###### 访问页面 http://localhost:3000/hello/world 源码如下

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>this title is json</title>
  <meta name="keywords" content="关键词" />
  <meta name="description" content="this description is json" />
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="/static/abc.css" />
  <link rel="stylesheet" href="/static/c1.css" />
  <link rel="stylesheet" href="/static/c2.css" />
  <link rel="stylesheet" href="/static/c3.css" />
  <script src="/static/def.js"></script>
  <script src="/static/j3.js"></script>
  <style>
    .body{color:#F00;}
  </style>
  <script>
    var top = 'top';
  </script>
</head>
<body>
<div>hello layout!</div>
<div>hello hello!</div>
<div>hello world!</div>
<script src="/static/abc.js"></script>
<script src="/static/j1.js"></script>
<script src="/static/j2.js"></script>
<script>
  var bottom = 'bottom';
</script>
</body>
</html>
```

###### 访问页面 http://localhost:3000/hello/world.json 源码如下

```json
{"sayWorld":"hello world!"}
```

- 扩展名.json不会渲染/html/hello/world.html页面

#### 页面之间的调用 call

###### 创建调用页面

- /html/test/data.html

```html
<div>{{ sayHello }}</div>
<div>{{ sayWorld }}</div>
```

- /html/test/data.js

```js
module.exports = async (hd) => {
  return {
    sayHello: "hello",
    sayWorld: hd.getView('sayWorld')
  };
};
```

###### 内部使用示例

###### /html/test/call.js

```js
module.exports = async (hd) => {
  return await hd.call(
    // 与hd.http模式不同
    // hd.call 内部访问 (相对路径、绝对路径)
    // hd.http 外部访问 (url模式)
    // 可以带参数访问，如:
    // /test/data.js?say=hello
    // data 解析为：/test/data
    // ./data 解析为：/test/data
    // ../data 解析为：/data
    // $.abc 解析为：/test/call.abc
    '/test/data',
    {
      sayWorld: "MyWorld"
    }
  );
};
```

###### 外部使用示例（以koa-route为例）

- 如果koa-web不能满足当下要求时，可与其他路由框架进行结合使用
- 需要另行安装: npm i koa-router

```js
const Koa = require("koa");
const KoaWeb = require('koa-web');
const router = require("koa-router")();

const app = new Koa();

app.use(KoaWeb({path: __dirname}));

router.get("/route/web", async (ctx, next) => {
  await next();
  if (!ctx.body) {
    let ret = await ctx.app.call(
      // 因为是外部调用，等同于 /test/data
      'test/data',
      {
        sayWorld: "MyWorld"
      }
    );
    ctx.body = ret;
  }
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000, () => {
  console.log("server is running at http://localhost:3000");
});
```

###### 访问以下两个链接

- http://localhost:3000/test/call
- http://localhost:3000/route/web

###### 其结果相同，预览源码如下

```html
<div>hello</div>
<div>MyWorld</div>
```

---

## HTTP快捷应用

#### 单个请求实例

- 支持 http 和 https
- /html/test/http.js

```js

const fs = require("fs");

/**
 * 提交方式说明
 * get: 非POST提交
 * form: multipart/form-data
 * xform: application/x-www-form-urlencoded
 * json: application/json
 * @param {*} hd 
 * @returns 
 */
module.exports = async (hd) => {
  let options = {
    url: 'http://localhost:3000/test/call?a=123&b=456',

    // 数据代理，支持：get、form、xform、json
    // get 通过浏览器URL和配置url进行合并，其他通过POST和配置data进行合并
    // 默认 {get: false, post: false, header:false}
    // {get: false, all: true} 等价于 {get: false, post: true, header:true}
    proxy: {
      // get: false,
      // post: false,
      // header: false,
      all: true
    },

    // 数据覆盖模式: 默认 asc
    // asc: POST覆盖配置
    // desc: 配置覆盖POST
    proxyCover: 'asc',

    // POST提交数据
    data: {
      abc: "test",
      hello: {
        world: "Is Ok"
      }
    },

    // 提交方式： get、form、xform、json
    // 如果不设置，默认以浏览器提交方式一致
    // type: 'json',

    // 上传文件
    files: {
      // 直接以文件路径提交
      str: "/tmp/abc.jpg",
      // Buffer
      buffer: new Buffer(10),
      bufferFrom: Buffer.from([0, 0]),
      // 使用 fs.createReadStream 需判断文件是否存在，否则会报错
      // fs: fs.createReadStream("/tmp/abc.jpg", { highWaterMark: 10 * 1024 * 1024 }),
      // 数组模式
      array: {
        // path可以是str、buffer和fs
        path: "/tmp/abc.jpg",
        // 可选，默认从path抽取
        name: "abc.jpg",
        // 可选，默认后缀名.jpg进行判断
        type: "image/jpeg"
      }
    },

    // 上传文件最大字节数，默认 10M
    fileMaxSize: 10 * 1024 * 1024,

    // 头文件设置，以下参数将设置无效
    // host, referer, content-length, transfer-encoding, content-type
    header: {
      'User-Agent': 'Mozilla/5.0'
    },

    // 超时设置，默认15秒
    timeout: 15000,

    // 数据返回类型，默认full， HTML是String或Buffer
    // full: 全部返回，{"status": true, "code": 200, "data": HTML, "ms": 62}
    // text：HTML
    // json: JSON.parse("HTML")
    dataType: 'full',

    // 获取二进制，默认为false，如果获取图片之类的须设置为true
    // 当设置为true时对dataType: "json" 无效
    // buffer: false,

    // 数据结果调试
    // index: 请求下标，在httpAll下效果显著
    // data: 页面信息
    // debug: (index, data) => {},
    // debug: async (index, data) => {},
  };

  let info = await hd.http(
    options, // 配置信息
    false // 可选，是否仅返回生成后的配置信息，默认 false
  );

  // 通常写法： await hd.http(options);

  return info;
};
```

#### 并发请求实例

- /html/test/httpAll.js

```js
/**
 * 并发处理请求， 采用Promise.all实现
 * @param {*} hd 
 * @returns 
 */
module.exports = async (hd) => {
  // 第二个参数可选，是否仅返回生成后的配置信息，默认 false
  // hd.httpAll(options, false);

  // Array 列表模式
  let [al, bl] = await hd.httpAll([{
      url: 'http://localhost:3000/test/call?flag=a',
      dataType: 'full'
    },
    {
      url: 'http://localhost:3000/test/call?flag=b'
    },
    // ...
  ]);

  // Object 对象模式
  let { a, b } = await hd.httpAll({
    a: {
      url: 'http://localhost:3000/test/call?flag=a'
    },
    b: {
      url: 'http://localhost:3000/test/call?flag=b'
    },
    // ...
  });

  return {
    al,
    bl,
    a,
    b
  }
};
```

---

## 页面扩展

#### 以下三种模式效果等效（页面默认设置）

- /html/test/demo.js

```js
// 模式1： 默认模式
module.exports = async hd => { return "hello ext!"; };

// 模式2：直接返回字符串
module.exports = 'hello ext!';

// 模式3： 对象模式
module.exports.html = 'hello ext!';
module.exports = { html: 'hello ext!' };
module.exports.html = async hd => { return 'hello ext!'; };
module.exports = { html: async hd => { return 'hello ext!'; } };
```

- http://localhost:3000/test/demo
- http://localhost:3000/test/demo.htm
- http://localhost:3000/test/demo.html
- http://localhost:3000/test/demo.json
- 默认情况下的页面扩展 demo、demo.htm、demo.html、 demo.json 共四种
- 如果要统一控制需使用全局配置中的 extTypes 或 extCalls
- 全局中可以设置 html 和 json 扩展
- 设置 module.exports.htm 和 module.exports.json 是无效的

#### 自定义页面扩展

- /html/test/ext.js

```js
/**
 * 默认首页
 * 访问： http://localhost:3000/test/ext
 * @param {*} hd 
 * @returns 
 */
module.exports.html = (hd) => {
  hd.css('ext.css');
  hd.js('ext.js');
  return "这是首页";
};

/**
 * 图片预览
 * 访问： http://localhost:3000/test/ext.jpg
 * @param {*} hd 
 * @returns 
 */
module.exports.jpg = (hd) => {
  // 浏览器页面缓存时间100秒
  // 不设置则不缓存
  // 设置 hd.age() 则页面缓存默认是 staticMaxage 配置值
  hd.age(100);

  // Content-Type 设置
  // 设置优先级如下
  // hd.ctx.type > KoaWeb 中的 extTypes > require("mime-types").types['当前扩展: jpg']
  // hd.ctx.type = 'image/png';
  
  // 文件读取模式
  // hd.read(): /项目根路径/html/test/ext.jpg
  // hd.read('txt'): /项目根路径/html/test/ext.txt
  // hd.read('/home/user/test.txt'): 绝对路径：/home/user/test.txt
  return hd.read();
};

/**
 * 获取其他网页图片并展示
 * 访问： http://localhost:3000/test/ext.png
 * @param {*} hd 
 * @returns 
 */
module.exports.png = async (hd) => {
  let info = await hd.http({
    url: "https://www.baidu.com/img/flexible/logo/pc/result.png",
    buffer: true
  });

  // 获取图片成功
  if (info.code === 200) {
    return Buffer.from(info.data);
  }

  // 获取图片失败
  // 修改掉默认的 image/png
  hd.ctx.type = "text/plain";
  
  return "无效图片!";
};

/**
 * css文件预览
 * 头文件会自动设置：Content-Type: text/css; charset=utf-8
 * 页面不会缓存
 * 访问： http://localhost:3000/test/ext.css
 */
module.exports.css = `body{ color:#F33; }`;

/**
 * js文件预览
 * 访问： http://localhost:3000/test/ext.js
 * 页面会缓存
 * @param {*} hd 
 * @returns 
 */
module.exports.js = hd => {
  // 这里hd.age就发挥了很大的作用，设置页面缓存将减少请求获取更好的性能
  hd.age(1000);

  // 读取文件 /html/test/ext.x.js 文件
  // return hd.read('x.js');
  
  // 注意：一般不使用 hd.read() 读取本文件 /html/test/ext.js

  // 渲染 /html/test/ext.x.js 文件，默认使用nunjucks模板引擎
  // read是读取二进制文件，render是强制转换成字符串
  // return hd.render({ test: "Hello Test!" }, 'x.js');

  return `console.log('打印测试');`;
};
```

- http://localhost:3000/test/ext
- http://localhost:3000/test/ext.jpg
- http://localhost:3000/test/ext.png
- http://localhost:3000/test/ext.css
- http://localhost:3000/test/ext.js

---

## 全局调用

- 全局调用是指与 view 配置中的 domains 无关联调用
- 全局调用使用 @ 符号为前缀进行设置

```js
// 域名绑定设置
// 假设访问: http://www.test.com
view: {
  domains: {
    "www.test.com": "test"
  }
}

// layout普通设置
// 布局路径指向为: /html/test/abc
json: {
  "layout": "abc"
}

// layout全局设置
// 布局路径指向为: /html/abc
json: {
  "layout": "@abc",
  // "module": "@module",
  // "view": "@view"
}

// 全局错误页面
errors: {
  404: "@errors/404",
  500: "@errors/500"
}

// 全局函数调用
hd.call("@test")

// 全局视图路径
hd.viewPath("@test")
```