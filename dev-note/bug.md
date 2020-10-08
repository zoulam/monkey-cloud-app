# Bug

## 1、remote失败

需要在主窗口设置  `enableRemoteModule: true`

```javascript
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            // 关闭安全策略,保证能够正常启动remote
            enableRemoteModule: true,
        }
    });
```

## 2、SimpleMDE切换文件失败

需要添加key

```react
                            <SimpleMDE
                                key={activeFile && activeFile.id}
                                value={activeFile && activeFile.body}
                                onChange={(value) => { console.log(value) }}
                                options={{
                                    minHeight: '620px'
                                }}
                            />
```

## 3、简单错误

### 3.1新建文件与旧文件重名

遍历旧文件，若存在相等弹出Dialog提示文件名已存在

### 3.2本地已删除，但是fileStore的json数据中未删除

打开之前先遍历`fileStore`，用 [fs.exists](http://nodejs.cn/api/fs.html#fs_fs_existssync_path)判断，返回`false`就删除json中的对象

### 3.3无内容匹配时应该让文件列表显示为空

## 4、window.require('electron')两头不是人错误

[解决方案外国人博客](https://erikmartinjordan.com/electron-react-ipcrenderer)

[解决方案国人博客内容是一样的](https://www.jianshu.com/p/d2d4deaccdc1)

## 6、 **todo**关闭子窗口父窗口会最小化

暂未解决

## 7、打包

### 7.1无法找到入口文件（Application entry  file “xx”does not exist）

![原因](https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201008212210389.png)

原因：[cra覆盖的原有的配置](https://www.electron.build/configuration/configuration)，只需要将extends设置为null即可

### 7.2Not allowed to load local resource

原因：**无法加载react页面**，electron认为react打包后的文件属于安装包内容，而不会集成到app中

[指定文件手动打包](https://www.electron.build/configuration/contents)

![手动打包](https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201008212723535.png)

### 7.3无法导入ailed to load resource : net :: ERR_CONNECTION_RESET

无法加载资源，解决方式，添加react主页面

```json
  "homepage": "./",
```

