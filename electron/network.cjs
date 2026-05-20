const os = require('node:os')

function getLocalIps() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address && address.family === 'IPv4' && !address.internal)
    .map((address) => address.address)
}

module.exports = { getLocalIps }
