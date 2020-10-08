const { BrowserWindow } = require('electron')
// 实现创建窗口的类
class AppWindow extends BrowserWindow {
  constructor(config, urlLocation) {
    // 默认配置选项
    const basicConfig = {
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
      },
      show: false,
      backgroundColor: '#efefef',
    }
    // 最终配置
    const finalConfig = { ...basicConfig, ...config }
    // 添加到父类
    super(finalConfig)
    // 使用父类方法
    this.loadURL(urlLocation)
    this.once('ready-to-show', () => {
      this.show()
    })
  }
}

module.exports = AppWindow