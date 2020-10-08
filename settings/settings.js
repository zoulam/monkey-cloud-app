const { remote, ipcRenderer } = require('electron')
const Store = require('electron-store')
const settingsStore = new Store({name: 'Settings'})
const qiniuConfigArr = ['#savedFileLocation','#accessKey', '#secretKey', '#bucketName']

// 封装DOM选择器
const $ = (selector) => {
  const result = document.querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}

// DOMContentLoaded滞后执行方案
document.addEventListener('DOMContentLoaded', () => {
  let savedLocation = settingsStore.get('savedFileLocation')
  if (savedLocation) {
    // 缓存上一次选定的值
    $('#savedFileLocation').value = savedLocation
  }
  // 获取配置数据去除#号，并持久化
  qiniuConfigArr.forEach(selector => {
    const savedValue = settingsStore.get(selector.substr(1))
    if (savedValue) {
      $(selector).value = savedValue
    }
  })
  $('#select-new-location').addEventListener('click', () => {

    remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: '选择文件的存储路径',
    }, (path) => {
      if (Array.isArray(path)) {
        $('#savedFileLocation').value = path[0]
      }
    })
  })
  // 打开路径，提交表单的时候存储到store
  $('#settings-form').addEventListener('submit', (e) => {
    e.preventDefault()
    qiniuConfigArr.forEach(selector => {
      if ($(selector)) {
        let { id, value } = $(selector)
        settingsStore.set(id, value ? value : '')
      }
    })
    // 发送事件告诉electron更新了界面
    ipcRenderer.send('config-is-saved')
    remote.getCurrentWindow().close()
  })
  // tab exchange
  $('.nav-tabs').addEventListener('click', (e) => {
    e.preventDefault()
    $('.nav-link').forEach(element => {
      element.classList.remove('active')
    })
    // 被点击的设置为 active
    e.target.classList.add('active')
    $('.config-area').forEach(element => {
      element.style.display = 'none'
    })
    $(e.target.dataset.tab).style.display = 'block'
  })
})