const qiniu = require('qiniu')
const QiniuManager = require('./src/utils/QiniuManager')
const path = require('path')

// 此处填入accessKey、secretKey
const accessKey = ''
const secretKey = ''
var localFile = "C:/Users/zoulam/Desktop/testupload.md"
const key = 'testupload.md'
const manger = new QiniuManager(accessKey, secretKey, 'zoulam-cloud-doc')
const downloadPath = path.join(__dirname, key);
// ~upload test
// manger.uploadFile(key, localFile).then(value => {
//   console.log('upload success', value);
// })

// ~delete test
// manger.deleteFile(key).then(() => {
//   console.log('delete success');
// })

// ~上传下载链式
// manger.uploadFile(key, localFile).then(value => {
//   console.log('upload success', value);
//   return manger.deleteFile(key);
// }).then(() => {
//   console.log('delete success');
// });

// ~桶域名获取
// manger.getBucketDomain().then(data => {
//   console.log(data);
// })

// ~获取下载链接
// manger.generateDownloadLink(key).then(data => {
//   console.log(data);
//   return manger.generateDownloadLink('testupload.md')
// }).then(data => {
//   console.log(data);
// })

// ~文件下载测试
// manger.downloadFile(key, downloadPath).catch(errData => {
//   console.log({ status: errData.err.status, statusText: errData.err.statusText });
// })
manger.downloadFile(key, downloadPath).then(value => {
  console.log('download success');
});
// var publicBucketDomain = 'http://qhv8ne4t9.hd-bkt.clouddn.com'





