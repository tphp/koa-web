## 适合场景

- WEB页面开发，开发过程中无需重启服务
- SEO、CSS和JS设置更轻松
- 简化了GET和POST请求处理
- 方便处理简单的压力测试

#### 依赖包

- 应用框架: [koa](https://koa.bootcss.com/)
- 静态文件处理: [koa-static](https://www.npmjs.com/package/koa-static) + [koa-mount](https://www.npmjs.com/package/koa-mount)
- 模板引擎: [nunjucks](https://nunjucks.bootcss.com/)
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
        ext: "html"
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
      // }

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
      // }
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
- 当cache=false时不需要重启Koa服务，就可以看到实时效果

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
 * hd: 主调用函数
 * @param {*} hd 
 * data: form-data、x-www-form-urlencoded和JSON数据会自动转化为该对象
 * @param {*} data 
 * files: 只有在form-data类型中产生
 * @param {*} files 
 * @returns 
 */
module.exports = async (hd, data, files) => {

  // hd.ctx.body = '设置了就只会显示这一段';
  
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
    // hd.call 内部访问
    // hd.http 外部访问
    // 可以带参数访问，如:
    // test/data.js?say=hello
    'test/data',
    {
      sayWorld: "MyWorld"
    }
  );
};
```

###### 外部使用示例（以koa-route为例）

- 如果koa-web不能满足当下要求时，可与其他路由框架进行结合使用

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

    // 数据返回类型，默认full
    // full: 全部返回，{"status": true, "code": 200, "data": "HTML", "ms": 62}
    // text：HTML
    // json: JSON.parse("HTML")
    dataType: 'full'
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
- 设置 module.exports.htm 和 module.exports.json 是无效的

#### 自定义页面扩展

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
  
  // hd.read(): 表示读取文件 /html/test/ext.jpg
  // hd.read('txt'): 表示读取文件 /html/test/ext.txt
  return hd.read();
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

  return `console.log('打印测试');`;
};
```

- http://localhost:3000/test/ext
- http://localhost:3000/test/ext.jpg
- http://localhost:3000/test/ext.css
- http://localhost:3000/test/ext.js