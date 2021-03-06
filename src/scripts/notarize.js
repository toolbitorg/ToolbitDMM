const path = require('path')
const { notarize } = require('electron-notarize')

const appleId = process.env.APPLE_ID
const appleIdPassword = process.env.APPLE_PASSWORD
const ascProvider = process.env.ASC_PROVIDER

const configPath = path.resolve(__dirname, '../package.json')
const appPath = path.resolve(__dirname, '../dist/mac/ToolbitDMM.app')
const config = require(configPath)
const appBundleId = config.build.appId

async function notarizeApp() {

  if(process.platform !== 'darwin') {
      return;
  }

  console.log(`afterSign: Notarizing ${appBundleId} in ${appPath}`)
  await notarize({
    appBundleId,
    appPath,
    appleId,
    appleIdPassword,
    ascProvider,
  })
  console.log('afterSign: Notarized')
}

exports.default = async () => {
  await notarizeApp()
}
