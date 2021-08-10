#### 包依赖

- [nunjucks](https://nunjucks.bootcss.com/) 模板引擎
- [koa](https://koa.bootcss.com/) 框架
- koa-static + koa-mount 静态文件处理

#### 安装 koa-web

```
npm i koa-web
```

#### 项目配置

```js
const Koa = require("koa");
const KoaWeb = require('koa-web')

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
        // 也可以 404: "errors.404"， 效果相同
        404: "errors/404",
        500: "errors/500"
      },

      // json配置文件全局配置，会和视图目录中的 ".json" 文件合并
      json: {
        // js: "hello.js",
        // css: ['hello.css', 'world.css'],
        // layout: "layout.test"
      },
    }
  )
);

// app.use(KoaWeb({path: __dirname})); // 快捷默认配置

app.listen(3000, () => {
  console.log("server is running at http://localhost:3000");
});
```

#### 创建主页面

- 默认路径对应 view > path 配置
- 默认路径: /html 默认扩展: .html
- 新建文件/html/index.html 并填写 Hello World ！
- 访问方式(效果一样)：
  - http://localhost:3000
  - http://localhost:3000/index
  - http://localhost:3000/index.htm
  - http://localhost:3000/index.html
- 当cache=false时不需要重启，就可以看到实时效果

#### 静态文件

- 创建/static/test.jpg文件
- 访问路径： http://localhost:3000/static/test.jpg

#### 错误页面

- 404： /html/errors/404.html
- 500： /html/errors/500.html
- 页面中设置 {{ code }}: 错误状态码
- 页面中设置 {{ message }}: 错误消息

#### 创建页面DEMO

> - 视图文件：/html/hello/world.html
> - 模板文件：/html/hello/world.js
> - 配置文件：/html/hello/world.json
> - 这3个文件至少存在一个

- /html/hello/world.html

> 更多模板引擎使用 [nunjucks](https://nunjucks.bootcss.com/)

```html
<div>{{ sayHello }}</div>
<div>{{ sayWorld }}</div>
```

- /html/hello/world.js

```js
module.exports = function (hd) {

  // 设置模板页面中函数（nunjucks模板）
  hd.view('sayHello', "hello hello!");
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

  return {
    sayWorld: "hello world!"
  };
}
```

- /html/hello/world.json

> - layout默认为不设置
> - css和js可以是字符串或数组

```json
{
  "layout": "hello.layout",
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

- /html/hello/layout.html

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

- /html/hello/layout.js

```js
module.exports = function (hd) {
  hd.view('sayLayout', "hello layout!");
}
```

#### 页面源码效果DEMO

- 访问页面 http://localhost:3000/hello/world 源码如下

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