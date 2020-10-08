import React, { useState } from 'react'
import { faPlus, faFileImport } from '@fortawesome/free-solid-svg-icons'
import SimpleMDE from "react-simplemde-editor"
import uuidv4 from 'uuid/v4'
import { flattenArr, objToArr, timestampToString } from './utils/helper'
import fileHelper from './utils/fileHelper'
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import "easymde/dist/easymde.min.css"

import FileSearch from './components/FileSearch'
import FileList from './components/FileList'
import BottomBtn from './components/BottomBtn'
import TabList from './components/TabList'
import Loader from './components/Loader'
import useIpcRenderer from './hooks/useIpcRenderer'
// require node.js modules
const { join, basename, extname, dirname } = window.require('path')
const { remote, ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')
const fileStore = new Store({ 'name': 'Files Data' })
const settingsStore = new Store({ name: 'Settings' })
// 获取最新同步信息
const getAutoSync = () => ['accessKey', 'secretKey', 'bucketName', 'enableAutoSync'].every(key => !!settingsStore.get(key))

// 从Files Data中取出信息
const saveFilesToStore = (files) => {
  const filesStoreObj = objToArr(files).reduce((result, file) => {
    const { id, path, title, createdAt, isSynced, updatedAt } = file
    result[id] = {
      id,
      path,
      title,
      createdAt,
      isSynced,
      updatedAt
    }
    return result
  }, {})
  fileStore.set('files', filesStoreObj)
}

function App() {
  const [files, setFiles] = useState(fileStore.get('files') || {}) // 文件信息
  const [activeFileID, setActiveFileID] = useState('') // 被选定的已经打开的文件窗口
  const [openedFileIDs, setOpenedFileIDs] = useState([])// 被打开的文件数组
  const [unsavedFileIDs, setUnsavedFileIDs] = useState([])// 未保存的文件数组
  const [searchedFiles, setSearchedFiles] = useState([]) // 用于展示的查找数组
  const [isLoading, setLoading] = useState(false) // 是否显示上传/下载的loading
  const [isEmpty, setIsEmpty] = useState(false)// 搜索内容是否为空
  const filesArr = objToArr(files)
  // 获取设置中的地址
  const savedLocation = settingsStore.get('savedFileLocation') || remote.app.getPath('documents')
  const activeFile = files[activeFileID]
  const openedFiles = openedFileIDs.map(openID => {
    return files[openID]
  })

  // 点击打开文件
  const fileClick = (fileID) => {
    setActiveFileID(fileID)
    const currentFile = files[fileID]
    const { id, title, path, isLoaded } = currentFile
    if (!isLoaded) {
      // 下载
      if (getAutoSync()) {
        ipcRenderer.send('download-file', { key: `${title}.md`, path, id })
      } else {
        fileHelper.readFile(currentFile.path).then(value => {
          const newFile = { ...files[fileID], body: value, isLoaded: true }
          setFiles({ ...files, [fileID]: newFile })
        })
      }
    }
    // 过滤已经打开的文件避免重复打开
    if (!openedFileIDs.includes(fileID)) {
      setOpenedFileIDs([...openedFileIDs, fileID])
    }
  }

  // 切换被选中的文件
  const tabClick = (fileID) => {
    setActiveFileID(fileID)
  }

  // 关闭标签
  const tabClose = (id) => {
    const tabsWithout = openedFileIDs.filter(fileID => fileID !== id)
    setOpenedFileIDs(tabsWithout)
    // 关闭时跳转到首个标签，无就全部关闭
    if (tabsWithout.length > 0) {
      setActiveFileID(tabsWithout[0])
    } else {
      setActiveFileID('')
    }
  }

  // 编辑了md文件的文本内容
  const fileChange = (id, value) => {
    // 过滤掉值没有变化的情况
    if (value !== files[id].body) {
      const newFile = { ...files[id], body: value }
      setFiles({ ...files, [id]: newFile })
      // 更新未保存显示小红点
      if (!unsavedFileIDs.includes(id)) {
        setUnsavedFileIDs([...unsavedFileIDs, id])
      }
    }
  }

  // 删除文件
  const deleteFile = (id) => {
    if (files[id].isNew) {
      const { [id]: value, ...afterDelete } = files
      setFiles(afterDelete)
    } else {
      fileHelper.deleteFile(files[id].path).then(() => {
        const { [id]: value, ...afterDelete } = files
        setFiles(afterDelete)
        saveFilesToStore(afterDelete)
        // 如果标签打开则需要关闭
        tabClose(id)
      })
    }
  }

  // 更新文件名
  const updateFileName = (id, title, isNew) => {
    // 根据是不是新文件做出不同处理，dirname获取文件路径
    // 新：使用新地址，旧：覆盖旧地址
    const newPath = isNew ? join(savedLocation, `${title}.md`)
      : join(dirname(files[id].path), `${title}.md`)
    const modifiedFile = { ...files[id], title, isNew: false, path: newPath }
    const newFiles = { ...files, [id]: modifiedFile }
    if (isNew) {
      fileHelper.writeFile(newPath, files[id].body).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    } else {
      const oldPath = files[id].path
      fileHelper.renameFile(oldPath, newPath).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    }

  }

  // 文件查找
  const fileSearch = (keyword) => {
    // 获取满足查找条件的文件参数
    const newFiles = filesArr.filter(file => file.title.includes(keyword))
    if (newFiles.length === 0) {
      setIsEmpty(true)
    } else {
      console.log('run');
      setSearchedFiles(newFiles)
      setIsEmpty(false)
    }
  }

  // 查找文件的中间态
  const fileListArr = isEmpty ? [] : ((searchedFiles.length > 0) ? searchedFiles : filesArr)

  // 创建新文件
  const createNewFile = () => {
    const newID = uuidv4()
    const newFile = {
      id: newID,
      title: '',
      body: '## 请输入 Markdown 文本',
      createdAt: new Date().getTime(),
      isNew: true,
    }
    setFiles({ ...files, [newID]: newFile })
  }

  // 保存文件，如果设置了云同步就云同步到自己的仓库
  const saveCurrentFile = () => {
    const { path, body, title } = activeFile
    fileHelper.writeFile(path, body).then(() => {
      setUnsavedFileIDs(unsavedFileIDs.filter(id => id !== activeFile.id))
      // 发送同步事件到mian.js
      if (getAutoSync()) {
        ipcRenderer.send('upload-file', { key: `${title}.md`, path })
      }
    })
  }
  const importFiles = () => {
    remote.dialog.showOpenDialog({
      title: '选择导入的 Markdown 文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown files', extensions: ['md'] }
      ]
    }, (paths) => {
      if (Array.isArray(paths)) {
        // ["/Users/liusha/Desktop/name1.md", "/Users/liusha/Desktop/name2.md"]
        // 过滤已经打开的文件
        const filteredPaths = paths.filter(path => {
          const alreadyAdded = Object.values(files).find(file => {
            return file.path === path
          })
          return !alreadyAdded
        })
        // basename取得文件名，extname去除后缀名
        // [{id: '1', path: '', title: ''}, {}]
        const importFilesArr = filteredPaths.map(path => {
          return {
            id: uuidv4(),
            title: basename(path, extname(path)),
            path,
          }
        })
        // 格式化数组内容，让electron store能够处理，
        const newFiles = { ...files, ...flattenArr(importFilesArr) }
        // 状态持久化
        setFiles(newFiles)
        saveFilesToStore(newFiles)
        // 提示框
        if (importFilesArr.length > 0) {
          remote.dialog.showMessageBox({
            type: 'info',
            title: `成功导入了${importFilesArr.length}个文件`,
            message: `成功导入了${importFilesArr.length}个文件`,
          })
        }
      }
    })
  }
  // 改变文件上传状态
  const activeFileUploaded = () => {
    const { id } = activeFile
    const modifiedFile = { ...files[id], isSynced: true, updatedAt: new Date().getTime() }
    const newFiles = { ...files, [id]: modifiedFile }
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }
  // 文件下载
  const activeFileDownloaded = (event, message) => {
    const currentFile = files[message.id]
    const { id, path } = currentFile
    fileHelper.readFile(path).then(value => {
      let newFile
      if (message.status === 'download-success') {
        newFile = { ...files[id], body: value, isLoaded: true, isSynced: true, updatedAt: new Date().getTime() }
      } else {
        newFile = { ...files[id], body: value, isLoaded: true }
      }
      const newFiles = { ...files, [id]: newFile }
      setFiles(newFiles)
      saveFilesToStore(newFiles)
    })
  }

  // 上传全部文件，改变状态
  const filesUploaded = () => {
    const newFiles = objToArr(files).reduce((result, file) => {
      const currentTime = new Date().getTime()
      result[file.id] = {
        ...files[file.id],
        isSynced: true,
        updatedAt: currentTime,
      }
      return result
    }, {})
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }


  // 下载全部文件
  useIpcRenderer({
    'create-new-file': createNewFile,
    'import-file': importFiles,
    'save-edit-file': saveCurrentFile,
    'active-file-uploaded': activeFileUploaded,
    'file-downloaded': activeFileDownloaded,
    'files-uploaded': filesUploaded,
    'loading-status': (message, status) => { setLoading(status) }
  })
  return (
    <div className="App container-fluid px-0">
      { isLoading &&
        <Loader />
      }
      <div className="row no-gutters">
        <div className="col-3 bg-light left-panel">
          <FileSearch
            title='My Document'
            onFileSearch={fileSearch}
          />
          <FileList
            files={fileListArr}
            onFileClick={fileClick}
            onFileDelete={deleteFile}
            onSaveEdit={updateFileName}
          />
          <div className="row no-gutters button-group">
            <div className="col">
              <BottomBtn
                text="新建"
                colorClass="btn-primary"
                icon={faPlus}
                onBtnClick={createNewFile}
              />
            </div>
            <div className="col">
              <BottomBtn
                text="导入"
                colorClass="btn-success"
                icon={faFileImport}
                onBtnClick={importFiles}
              />
            </div>
          </div>
        </div>
        <div className="col-9 right-panel">
          {!activeFile &&
            <div className="start-page">
              选择或者创建新的 Markdown 文档
            </div>
          }
          {activeFile &&
            <>
              <TabList
                files={openedFiles}
                activeId={activeFileID}
                unsaveIds={unsavedFileIDs}
                onTabClick={tabClick}
                onCloseTab={tabClose}
              />
              <SimpleMDE
                key={activeFile && activeFile.id}
                value={activeFile && activeFile.body}
                onChange={(value) => { fileChange(activeFile.id, value) }}
                options={{
                  minHeight: '515px',
                }}
              />
              {activeFile.isSynced &&
                <span className="sync-status">已同步，上次同步{timestampToString(activeFile.updatedAt)}</span>
              }
            </>
          }
        </div>
      </div>
    </div>
  );
}

export default App;
