import { useEffect } from 'react'
const { ipcRenderer } = window.require('electron')


// keyCallbackMap = {
//   'create-new-file': ()=>{},
//   'import-file': ()=>{},
//   'save-edit-file': ()=>{},
//   'active-file-uploaded': ()=>{},
//   'file-downloaded': ()=>{},
//   'files-uploaded': ()=>{},
// }
// 原生菜单
const useIpcRenderer = (keyCallbackMap) => {
  useEffect(() => {
    Object.keys(keyCallbackMap).forEach(key => {
      // 给每一个菜单添加事件
      ipcRenderer.on(key, keyCallbackMap[key])
    })
    return () => {
      Object.keys(keyCallbackMap).forEach(key => {
        ipcRenderer.removeListener(key, keyCallbackMap[key])
      })
    }
  })
}

export default useIpcRenderer