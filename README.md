Toolbit DMM application
====

Toolbit DMM is cross platform application software based on electron to control a digital multimeter.

## Description

This is not ready for release.

## Binary release

Binary images for Ubuntu/macOS/Windows are released in GitHub. If you just want to use app, please download it below:
- https://github.com/toolbitorg/ToolbitDMM/releases


## Build

### Preparation

It is required to install the following software in advance to build Toolbit DMM.

Commom:
- `Node.js 8.x` (9.x or later version is not supported because swig support only 8.x for now)
- `yarn` https://yarnpkg.com/

Windows:
- MinGW environment

macOS:
- Xcode

### Quick start

```sh
git clone https://github.com/toolbitorg/ToolbitDMM.git
cd src
npm install
npm start
```

### Build package
```sh
cd src
npm run dist
```


## References for learning electron

- `electron-quick-start` https://electronjs.org/docs/tutorial/quick-start
- `electron-updater-example` https://github.com/iffy/electron-updater-example


## License

[GPLv2] Please refer to the LICENSE file in this repository
