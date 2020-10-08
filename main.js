const { app, Menu, ipcMain, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const isDev = require('electron-is-dev')
const path = require('path')
const menuTemplate = require('./src/menuTemplate')
const AppWindow = require('./src/AppWindow')
const Store = require('electron-store')
const QiniuManager = require('./src/utils/QiniuManager')
const settingsStore = new Store({ name: 'Settings' })
const fileStore = new Store({ name: 'Files Data' })
let mainWindow, settingsWindow

// 初始化七牛云管理
const createManager = () => {
  const accessKey = settingsStore.get('accessKey')
  const secretKey = settingsStore.get('secretKey')
  const bucketName = settingsStore.get('bucketName')
  return new QiniuManager(accessKey, secretKey, bucketName)
}
app.on('ready', () => {
  // 开发环境读取自定义的更新地址
  if (Dev) {
    autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
  }
  // 自动更新模块
  autoUpdater.autoDownload = false
  autoUpdater.checkForUpdates()
  autoUpdater.on('error', (error) => {
    dialog.showErrorBox('Error', error === null ? "unknow" : (error))
  })
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新……')
  })
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '应用有新的版本',
      message: '发现有新版本，是否现在更新？',
      buttons: ['是', '否']
    }, (buttonIndex) => {
      if (buttonIndex === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })
  autoUpdater.on('update-not-available', () => {
    dialog.showMessageBox({
      title: '没有新版本',
      message: '当前已经是最新版本'
    })
  })
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed" + progressObj.bytesPerSecond
    log_message = log_message + '-Downloaded' + progressObj.percent + '%'
    log_message = log_message + '(' + progressObj.transferred + '/' + progressObj.total + '%' + ')'
    console.log(log_message)
  })
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      title: "下载完成",
      message: "下载完成，应用即将重启并安装"
    }, () => {
      setImmediate(() => { autoUpdater.quitAndInstall()})
    })
  })


  const mainWindowConfig = {
    width: 1440,
    height: 768,
  }
  const urlLocation = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './index.html')}`
  console.log('urlLocation', urlLocation);
  mainWindow = new AppWindow(mainWindowConfig, urlLocation)
  // 窗口关闭回收变量
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  // set the menu
  let menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // 菜单中的设置窗口，此处直接使用静态页面，不用使用react
  ipcMain.on('open-settings-window', () => {
    const settingsWindowConfig = {
      width: 500,
      height: 400,
      parent: mainWindow
    }
    // 解析本地文件
    const settingsFileLocation = isDev
      ? `file://${path.join(__dirname, './settings/settings.html')}`
      : `file://${path.join(__dirname, '../settings/settings.html')}`
    console.log('settingsFileLocation', settingsFileLocation);
    settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation)
    // settingsWindow.removeMenu()
    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
  })
  // 上传文件
  ipcMain.on('upload-file', (event, data) => {
    const manager = createManager()
    manager.uploadFile(data.key, data.path).then(data => {
      console.log('上传成功', data)
      mainWindow.webContents.send('active-file-uploaded')
    }).catch(() => {
      dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
    })
  })
  // 下载文件
  ipcMain.on('download-file', (event, data) => {
    const manager = createManager()
    const filesObj = fileStore.get('files')
    const { key, path, id } = data
    manager.getStat(data.key).then((resp) => {
      // 比较服务端时间和本地保存时间来确定哪个比较新
      const serverUpdatedTime = Math.round(resp.putTime / 10000)
      const localUpdatedTime = filesObj[id].updatedAt
      if (serverUpdatedTime > localUpdatedTime || !localUpdatedTime) {
        manager.downloadFile(key, path).then(() => {
          mainWindow.webContents.send('file-downloaded', { status: 'download-success', id })
        })
      } else {
        mainWindow.webContents.send('file-downloaded', { status: 'no-new-file', id })
      }
    }, (error) => {
      // 如果文件未在七牛云同步就不处理
      if (error.statusCode === 612) {
        mainWindow.webContents.send('file-downloaded', { status: 'no-file', id })
      }
    })
  })
  // 上传全部文件
  ipcMain.on('upload-all-to-qiniu', () => {
    mainWindow.webContents.send('loading-status', true)
    const manager = createManager()
    // 获取本地文件信息
    const filesObj = fileStore.get('files') || {}
    // 获取
    const uploadPromiseArr = Object.keys(filesObj).map(key => {
      const file = filesObj[key]
      return manager.uploadFile(`${file.title}.md`, file.path)
    })

    Promise.all(uploadPromiseArr).then(result => {
      console.log(result)
      // 弹出上传提示
      dialog.showMessageBox({
        type: 'info',
        title: `成功上传了${result.length}个文件`,
        message: `成功上传了${result.length}个文件`,
      })
      mainWindow.webContents.send('files-uploaded')
    }).catch(() => {
      dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
    }).finally(() => {
      mainWindow.webContents.send('loading-status', false)
    })
  })

  // 更新失效的菜单
  ipcMain.on('config-is-saved', () => {
    // 根据平台不同取得不同位置的菜单
    let qiniuMenu = process.platform === 'darwin' ? menu.items[3] : menu.items[2]
    const switchItems = (toggle) => {
      [1, 2, 3].forEach(number => {
        qiniuMenu.submenu.items[number].enabled = toggle
      })
    }
    const qiniuIsConfiged = ['accessKey', 'secretKey', 'bucketName'].every(key => !!settingsStore.get(key))
    // 根据是否获取配置更换菜单是否可用
    if (qiniuIsConfiged) {
      switchItems(true)
    } else {
      switchItems(false)
    }
  })
})
