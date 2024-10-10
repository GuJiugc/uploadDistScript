const fs = require('fs');
const archiver = require('archiver');
const { Client } = require('ssh2');

const conn = new Client();

let sysConfig1 = {
    host: '192.168.100.100',
    port: 22,
    username: 'root',
    password: '123456',
    remoteDir: '/home/web',
    zipFileName: 'dist.zip',
    fileDir: '../hello-world/dist',
}

let sysConfig2 = {
    host: '192.168.100.100',
    port: 22,
    username: 'root',
    password: '123456',
    remoteDir: '/home/web',
    zipFileName: 'dist.zip',
    fileDir: '../hello-world/dist'
}


let finalConfig = {}

let x = process.argv[2]

if (x == 'sys1') {
    finalConfig = sysConfig1
} else if (x == 'sys2') {
    finalConfig = sysConfig2
}


function deleteFile(config) {
    return new Promise((resolve, reject) => {
        fs.access(__dirname + '/' + config.zipFileName, fs.constants.F_OK, (err) => {
            if (err) {
                resolve()
                return console.log('文件不存在')
            }
            fs.unlinkSync(__dirname + '/' + config.zipFileName)
            resolve()
        })
    })
}

function zipFile(config) {
    return new Promise((resolve, reject) => {
        var output = fs.createWriteStream(__dirname + '/' + config.zipFileName)
        var archive = archiver('zip', {
            zlib: { level: 9 }
        })
        output.on('close', function () {
            resolve()
        });
        archive.on('error', function (err) {
            throw err;
        });
        archive.pipe(output);
        // 配置第二个参数为false的话，会将内部文件打包，而不是将文件夹打包
        archive.directory(__dirname + '/' + config.fileDir + '/', false);
        archive.finalize();
    })
}

function uploadFile(config) {
    return new Promise((resolve, reject) => {
        conn.on('ready', function () {
            console.log('Client ready');
            conn.sftp(function (err, sftp) {
                if (err) throw err;

                // 业务逻辑
                sftp.fastPut(`${__dirname}/${config.zipFileName}`, `${config.remoteDir}/${config.zipFileName}`,
                    (err) => {
                        if (err) {
                            console.log('错误' + err)
                            return
                        }
                        console.log('上传成功')

                        conn.exec(`unzip -o ${config.remoteDir}/${config.zipFileName} -d ${config.remoteDir}`, (err, stream) => {
                            if (err || !stream) {
                                reject('失败')
                            } else {
                                stream.on('close', () => {
                                    console.log('上传完成')
                                    resolve()
                                }).on('data', (data) => {
                                    console.log(data.toString())
                                })
                            }
                        })
                    })
            });
        }).connect(config);
    })
}

async function removeZip(config) {
    return new Promise((resolve, reject) => {
        conn.exec(`rm -rf ${config.remoteDir}/${config.zipFileName}`, (err, stream) => {
            if (err || !stream) {
                reject('失败')
            } else {
                stream.on('close', () => {
                    console.log('删除完成')
                    resolve()
                }).on('data', (data) => {
                    console.log(data.toString())
                })
            }
        })
    })

}

async function handle(config) {
    if (!config.host) {
        console.log('配置错误')
        return
    }
    await deleteFile(config)
    await zipFile(config)
    await uploadFile(config)
    await removeZip(config)
    conn.end()
    console.log('打包并上传完成')
}

handle(finalConfig)