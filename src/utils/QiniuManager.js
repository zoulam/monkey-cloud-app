const qiniu = require('qiniu')
const axios = require('axios')
const fs = require('fs')
class QiniuManager {
  constructor(accessKey, secretKey, bucketName) {
    //generate mac
    this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    this.bucket = bucketName

    // init config class
    this.config = new qiniu.conf.Config()
    // 空间对应的机房
    this.config.zone = qiniu.zone.Zone_z0

    this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
  }
  // 文件上传
  uploadFile(key, localFilePath) {
    // generate uploadToken
    const options = {
      scope: this.bucket + ":" + key,
    };
    const putPolicy = new qiniu.rs.PutPolicy(options)
    const uploadToken = putPolicy.uploadToken(this.mac)
    const formUploader = new qiniu.form_up.FormUploader(this.config)
    const putExtra = new qiniu.form_up.PutExtra()
    //文件上传
    return new Promise((resolve, reject) => {
      formUploader.putFile(uploadToken, key, localFilePath, putExtra, this._handleCallback(resolve, reject));
    })

  }
  // 删除文件
  deleteFile(key) {
    return new Promise((resolve, reject) => {
      this.bucketManager.delete(this.bucket, key, this._handleCallback(resolve, reject))
    })
  }
  // 获取bucket域名
  getBucketDomain() {
    const reqURL = `http://api.qiniu.com/v6/domain/list?tbl=${this.bucket}`
    const digest = qiniu.util.generateAccessToken(this.mac, reqURL)
    return new Promise((resolve, reject) => {
      qiniu.rpc.postWithoutForm(reqURL, digest, this._handleCallback(resolve, reject))
    })
  }

  // 基于七牛api获取bucket内的文件信息
  getStat(key) {
    return new Promise((resolve, reject) => {
      this.bucketManager.stat(this.bucket, key, this._handleCallback(resolve, reject))
    })
  }

  // 获取下载链接
  generateDownloadLink(key) {
    // 避免重复请求
    const domainPromise = this.publicBucketDomain
      ? Promise.resolve([this.publicBucketDomain])
      : this.getBucketDomain()
    return domainPromise.then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const pattern = /^https?/
        // 没有http开头就添加
        this.publicBucketDomain = pattern.test(data[0]) ? data[0] : `http://${data[0]}`
        return this.bucketManager.publicDownloadUrl(this.publicBucketDomain, key)
      } else {
        throw Error('域名未找到，请查看存储空间是否已经过期')
      }
    })
  }

  /**
   *
   * @param {*} key 下载key（文件名）
   * @param {*} downloadPath 本地地址
   */
  downloadFile(key, downloadPath) {
    // step 1 获取下载链接
    // step 2 发送http请求，获取可读流
    // step 3 创建可写流和管道
    // step 4 返回Promise结果
    return this.generateDownloadLink(key).then(link => {
      // !添加时间戳，避免浏览器缓存
      const timeStamp = new Date().getTime()
      const url = `${link}?timestamp=${timeStamp}`
      return axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: { 'Cache-Control': 'no-cache' }
      })
    }).then(response => {
      const writer = fs.createWriteStream(downloadPath)
      response.data.pipe(writer)
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })
      // ! 处理axios请求错误
    }).catch(err => {
      return Promise.reject({ err: err.response })
    })
  }

  // 高阶函数封装Promise
  _handleCallback(resolve, reject) {
    return (respErr, respBody, respInfo) => {
      if (respErr) {
        throw respErr;
      }
      if (respInfo.statusCode === 200) {
        resolve(respBody)
      } else {
        reject({
          statusCode: respInfo.statusCode,
          body: respBody
        })
      }
    }
  }
}

module.exports = QiniuManager