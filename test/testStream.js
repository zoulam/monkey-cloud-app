const fs = require('fs')
const { stdout } = require('process')
const zlib = require('zlib')

const src = fs.createReadStream('./test.js')
// process.stdout原生支持可写
// src.pipe(stdout)

// stream拷贝
// const writeDesc = fs.createWriteStream('./test.copy')
// src.pipe(writeDesc)

// 转换流文件压缩
const writeDesc = fs.createWriteStream('./test.gz')
src.pipe(zlib.createGzip()).pipe(writeDesc)


// 事件
// readable.on('data', (chunk) => {
//     writeable.write(chunk)
// })

// readable.on('end', () => {
//     writeable.end()
// })

