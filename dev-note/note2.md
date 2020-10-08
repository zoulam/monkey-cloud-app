# 1、添加交互逻辑

## 设计原则

[设计哲学里面有讲最小UIState](https://zh-hans.reactjs.org/docs/thinking-in-react.html)

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006162344824.png" alt="设计原则" style="zoom: 33%;" />

##  状态分析

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006161835796.png" alt="状态分析" style="zoom:50%;" />

## 状态设计

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006161930680.png" alt="状态设计" style="zoom:50%;" />

![去除冗余](https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006161949720.png)

## 数据流

![数据流](https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006162111783.png)

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006162501327.png" alt="向外暴露的回调" style="zoom:67%;" />

## 组件方法分析

![组件方法分析](https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006165406804.png)

## **单向数据流的理解**

向下：子组件以形参的形式向外暴露回调函数，App（父组件）向下传输数据，

修改：修改是由App向子组件传入实参（回调函数），而执行是发生在子组件的逻辑。

优点：代码逻辑清晰

缺点：比传统的双向绑定代码量大

# 2、函数实现

## 简单函数实现

```react
    // ? 反向数据流的实现
    // 点击打开文件
    const fileClick = (fileId) => {
        setActiveFileId(fileId)
        // 剔除已经打开的文件id
        if (!openFileIds.includes(fileId)) {
            setOpenFileIds([...openFileIds, fileId])
        }
    }
    // 点击文件标签,实现被选定文件切换
    const tabClick = (fileId) => {
        setActiveFileId(fileId)
    }
    // 关闭标签
    const tabClose = (fileId) => {
        let tabsWithout = openFileIds.filter(openFileId => openFileId !== fileId);
        setOpenFileIds(tabsWithout);
        if (tabsWithout) {
            setActiveFileId(tabsWithout[0]);
        } else {
            setActiveFileId('')
        }
    }

    // 获取新的文件信息
    const getNewFile = (id, newVal, oldValKey) => {
        return files.map(file => {
            if (file.id === id) {
                file[oldValKey] = newVal;
            }
            return file;
        })
    }

    // 保存输入
    const fileChange = (id, value) => {
        const newFiles = getNewFile(id, value, 'body');
        setFiles(newFiles)
        if (!unSavedFileIds.includes(id)) {
            setUnSavedFileIds([...unSavedFileIds, id]);
        }
    }
    // 删除文件
    const fileDelete = (id) => {
        const deleteWithout = files.filter(file => file.id !== id)
        setFiles(deleteWithout);
        if (openFileIds.includes(id)) {
            tabClose(id);
        }
    }

    // 更新文件名
    const updateFileName = (id, title) => {
        const newFiles = getNewFile(id, title, 'title');
        setFiles(newFiles);
    }

    /**
     *
     * @param {*} keyword
     * @description
     * 出现bug，file的状态被改变会干扰的其他数据的显示
     * 新增searchFiles进行状态管理
     */
    const fileSearch = (keyword) => {
        const newFiles = files.filter(file => file.title.includes(keyword));
        if (newFiles.length === 0) {
            setIsNone(true)
        } else {
            setSearchFiles(newFiles);
            setIsNone(false)
        }
    }
    // 文件列表数据处理
    let fileListArr = isNone ? [] : ((searchFiles.length > 0) ? searchFiles : files);
```

## 创建文件函数

> ​	创建文件函数涉及到编辑文件的列表的操作，要注意修改交互逻辑

```react
    const createFile = () => {
        const newId = uuidv4();
        const newFiles = [
            ...files,
            {
                id: newId,
                // title: '新建文件',
                title: '',
                body: '## second test',
                ceatedAt: Date.now(),
                isNew: true
            }
        ]
        setFiles(newFiles);
    }
```

```react
// fileList部分
// 新建文件编辑进入状态
    useEffect(() => {
        const newFile = files.find(file => file.isNew);
        if (newFile) {
            setEditStatus(newFile.id);
            setValue(newFile.title);
        }
    }, [files])
```

# 3、简单重构

> ​	**对象/HashMap**的增删改查比起 **数组**的增删改查代码更加简洁、高效。

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006222120895.png" alt="数组结构" style="zoom:50%;" />

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201006222141290.png" alt="对象结构" style="zoom:50%;" />

[redux也是这样建议设计State的](https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape#designing-a-normalized-state)

# 4、Nodejs

## **引入问题**

webpack 会使用自己的require `__webpackrequire__`方法封装**commonjs和es6modules**，`window.require()`可以阻止这个行为。

```JavaScript
const fs = window.require('fs');
```

**fs.promises是在node10之后推出的，electron是有自己的nodejs的需要检查**

## 文件读写操作

[electron获取不同操作系统的文件路径](https://www.electronjs.org/docs/api/app#appgetpathname) **注**：这个方法是在主进程的

写入：

1、新建文件

2、手动保存

## 文件数据持久化

[electron-store](https://github.com/sindresorhus/electron-store)

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201007114139266.png" alt="持久化策略" style="zoom:50%;" />

 **注**：store存储 **id title path createAt**四项信息

持久化的节点： **新建、删除、重命名**

# 5、Dialog

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201007123439638.png" alt="dialog" style="zoom:50%;" />

[electron-dialog](https://www.electronjs.org/docs/api/dialog#dialogshowerrorboxtitle-content)

# 6、MenU

[electron-menu](https://www.electronjs.org/docs/api/menu)

## 6.1原生菜单

可见的，跟操作系统有联系的

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201007180343119.png" alt="menu" style="zoom: 50%;" />

### [快捷键](https://www.electronjs.org/docs/api/accelerator)

### [关于默认菜单](https://github.com/electron/electron/blob/master/lib/browser/default-menu.ts)

好像用ts重构了

### 菜单逻辑

主进程发送事件给渲染进程，由渲染进程完成操作。

## 6.2上下文菜单

不可见的，根据上下使用快捷键（鼠标右键）打开

### 存储节点文件的id

使用 `data-` [文档介绍](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Global_attributes/data-*)

​		[Element.classList](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/classList)

### [shell](https://www.electronjs.org/docs/api/shell#shellbeep)

提供electron和桌面相关的功能

### getCurrentWindow

获取electron窗口

# 7、设置

## 方案

1、打开新窗口 **√**

2、使用react-router切换router **X**

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201007202651565.png" alt="创建窗口的思路" style="zoom: 67%;" />

# 8、云储存

- 块储存 一块一块存储在硬盘中
- 文件储存 储存在操作系统的文件系统中
- [对象存储](https://www.alibabacloud.com/zh/knowledge/what-is-object-storage)

## 选择七牛云

[开发者文档](https://developer.qiniu.com/)

​	[nodejsSDK](https://developer.qiniu.com/kodo/sdk/1289/nodejs)

​	[获取bucket域名](https://developer.qiniu.com/kodo/api/3949/get-the-bucket-space-domain)

开发过程：

1. 先执行按照SDK文档跑通

2. 封装到一个类

3. 将原始的回调封装成Promise

## node stream

与传统文件读写用一块一块的内存运输不同，用涓涓细流的方式进行文件传输。

好处：占用内存少

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201008134408699.png" alt="支持模块" style="zoom:67%;" />

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201008134521020.png" alt="流的类型" style="zoom:67%;" />

​    

**转换流是双线流的一种**

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201008135422245.png" alt="转换流" style="zoom:67%;" />

<img src="https://zoulam-pic-repo.oss-cn-beijing.aliyuncs.com/img/image-20201008134954339.png" alt="流是基于事件的" style="zoom:67%;" />

## axios下载

[axios](https://github.com/axios/axios)

## 集成到视图界面

[bootstrap：form-groups](https://getbootstrap.com/docs/4.5/components/forms/#form-groups)

### 实现逻辑

由视图层的APP发送事件到electron的主进程完成同步，实现简单解耦。

保存：**上传**

打开：如果云文档存在就**下载**

### 关于计算机中的时间

[unix_time-stamp](https://www.unixtimestamp.com/)

[qiniu-putTime](https://developer.qiniu.com/kodo/api/1308/stat)

七牛云使用的时100纳秒为单位，而JavaScript使用毫秒。

`1,000,000 ns = 1ms`

`1 / 10000ms = 100ns`

## 全部上传全部下载

样式：[bootstrap-spinner](https://getbootstrap.com/docs/4.5/components/spinners/)

**(menuTemplate.js)**ipcMain.send => **(main.js)**ipcMain.on

下载全部

[listprefix](https://developer.qiniu.com/kodo/sdk/1289/nodejs)

获取全部前缀

## 新的需求

重命名 使用[moveapi](https://developer.qiniu.com/kodo/sdk/1289/nodejs)完成 和删除完成同步

