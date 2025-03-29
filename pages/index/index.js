
Page({
  data: {
    scanResult: '', // 存储扫描结果
    config: null // 存储应用配置
  },

  onLoad() {
    // 获取应用配置
    const app = getApp()
    this.setData({
      config: app.getConfig()
    })
    // 检查相机权限
    this.checkCameraAuth()
  },

  onShow() {
    // 页面显示时，检查是否有上次的扫码结果
    const lastResult = wx.getStorageSync('lastScanResult')
    if (lastResult) {
      this.setData({
        scanResult: lastResult
      })
    }
  },

  // 扫码相关方法
  scanCode() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera'] === false) {
          // 已经拒绝过授权
          wx.showModal({
            title: '提示',
            content: '需要相机权限才能扫码，是否去设置？',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          // 未授权或已授权
          wx.authorize({
            scope: 'scope.camera',
            success: () => {
              this.doScanCode()
            },
            fail: () => {
              wx.showToast({
                title: '获取相机权限失败',
                icon: 'none',
                duration: 2000
              })
            }
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '获取授权状态失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  doScanCode() {
    wx.scanCode({
      onlyFromCamera: false, // 允许从相册选择
      scanType: ['qrCode', 'barCode'], // 支持二维码和条形码
      success: (res) => {
        console.log('扫码成功：', res)
        
        // 检查并处理结果
        const processedResult = this.preprocessScanResult(res)
        if (!processedResult) {
          wx.showToast({
            title: '扫码结果为空',
            icon: 'none',
            duration: 2000
          })
          return
        }

        // 更新状态
        this.setData({
          scanResult: processedResult
        })
        
        // 保存最后的扫码结果
        wx.setStorageSync('lastScanResult', processedResult)
        
        // 保存到历史记录
        this.saveToHistory(processedResult)

        // 显示成功提示
        wx.showToast({
          title: '扫码成功',
          icon: 'success',
          duration: 1500
        })
      },
      fail: (err) => {
        console.error('扫码失败：', err)
        wx.showToast({
          title: err.errMsg || '扫码失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 结果处理相关方法
  preprocessScanResult(res) {
    if (!res || !res.result) return ''
    
    const result = res.result.trim()
    
    // 如果是WiFi配置，进行特殊处理
    if (result.startsWith('WIFI:')) {
      const wifiInfo = this.parseWifiConfig(result)
      if (wifiInfo) {
        return wifiInfo
      }
    }
    
    // 如果是条形码
    if (res.scanType === 'barCode') {
      return {
        type: 'barcode',
        result: result,
        codeType: res.scanCode?.codeType || 'unknown',
        codeText: this.getCodeTypeText(res.scanCode?.codeType),
        raw: res
      }
    }
    
    // 如果是URL，检查是否需要添加协议
    if (result.match(/^www\./i)) {
      return {
        type: 'url',
        result: 'http://' + result,
        raw: result
      }
    }
    
    // 其他类型
    return {
      type: this.getResultType(result),
      result: result,
      raw: result
    }
  },

  // 获取条形码类型说明
  getCodeTypeText(codeType) {
    switch(codeType) {
      case 'ean13': return 'EAN-13';
      case 'ean8': return 'EAN-8';
      case 'upca': return 'UPC-A';
      case 'upce': return 'UPC-E';
      case 'code128': return 'Code 128';
      case 'code39': return 'Code 39';
      case 'code93': return 'Code 93';
      case 'codabar': return 'Codabar';
      case 'itf': return 'ITF';
      default: return '条形码';
    }
  },

  parseWifiConfig(result) {
    try {
      // 移除 'WIFI:' 前缀
      const wifiStr = result.substring(5)
      
      // 提取WiFi参数
      const params = {}
      wifiStr.split(';').forEach(item => {
        if (item) {
          const matches = item.match(/([^:]+):(.+)/)
          if (matches) {
            params[matches[1]] = matches[2]
          }
        }
      })

      // 返回处理后的WiFi信息
      return {
        type: 'wifi',
        ssid: params.S || '',  // WiFi名称
        password: params.P || '', // WiFi密码
        encryption: params.T || '', // 加密类型
        hidden: params.H === 'true', // 是否隐藏
        raw: result
      }
    } catch (err) {
      console.error('解析WiFi配置失败：', err)
      return null
    }
  },

  getResultType(result) {
    if (!result) return 'unknown'
    
    const supportedTypes = this.data.config?.supportedTypes || ['wifi', 'url', 'json', 'number', 'barcode', 'text']
    
    // 判断是否是URL - 使用更完善的URL检测正则
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/i
    if ((urlPattern.test(result) || result.match(/^www\./i)) && supportedTypes.includes('url')) {
      return 'url'
    }
    
    // 判断是否是纯数字
    if (/^\d+$/.test(result) && supportedTypes.includes('number')) {
      return 'number'
    }
    
    // 判断是否包含JSON结构
    if (result.startsWith('{') && result.endsWith('}') && supportedTypes.includes('json')) {
      try {
        JSON.parse(result)
        return 'json'
      } catch (e) {}
    }
    
    return 'text'
  },

  // 复制相关方法
  copyResult() {
    if (!this.data.scanResult) {
      return
    }

    // 如果是WiFi信息，复制完整信息
    if (this.data.scanResult.type === 'wifi') {
      const wifiInfo = `WiFi名称：${this.data.scanResult.ssid}\nWiFi密码：${this.data.scanResult.password}`
      this.copyToClipboard(wifiInfo)
    } else if (this.data.scanResult.type === 'barcode') {
      // 复制条形码信息
      const barcodeInfo = `${this.data.scanResult.codeText}\n${this.data.scanResult.result}`
      this.copyToClipboard(barcodeInfo)
    } else {
      // 普通文本复制
      this.copyToClipboard(this.data.scanResult.result || this.data.scanResult)
    }
  },

  copyWifiPassword() {
    if (this.data.scanResult && this.data.scanResult.type === 'wifi') {
      this.copyToClipboard(this.data.scanResult.password, '密码')
    }
  },

  copyWifiName() {
    if (this.data.scanResult && this.data.scanResult.type === 'wifi') {
      this.copyToClipboard(this.data.scanResult.ssid, '名称')
    }
  },

  copyToClipboard(data, type = '') {
    wx.setClipboardData({
      data: data,
      success: () => {
        wx.showToast({
          title: type ? `已复制${type}` : '已复制到剪贴板',
          icon: 'success',
          duration: 1500
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none',
          duration: 1500
        })
      }
    })
  },

  // 历史记录相关方法
  saveToHistory(result) {
    try {
      const now = new Date()
      const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      
      // 处理结果数据，确保正确的格式
      let processedResult = result;
      if (typeof result === 'object') {
        processedResult = {
          ...result,
          displayText: result.type === 'wifi' ? 
            `WiFi: ${result.ssid}` : 
            (result.type === 'barcode' ? 
              `${result.codeText}: ${result.result}` : 
              result.result)
        };
      }

      const historyItem = {
        id: Date.now().toString(),
        result: processedResult,
        time: time,
        type: (result && result.type) || this.getResultType(result)
      }

      // 获取现有历史记录
      let history = wx.getStorageSync('scanHistory') || []
      
      // 检查是否存在重复记录
      const isDuplicate = history.some(item => 
        item.type === historyItem.type && 
        JSON.stringify(item.result) === JSON.stringify(result)
      )
      
      if (isDuplicate) {
        // 如果存在重复，删除旧记录
        history = history.filter(item => 
          !(item.type === historyItem.type && 
            JSON.stringify(item.result) === JSON.stringify(result))
        )
      }
      
      // 添加新记录到开头
      history.unshift(historyItem)
      
      // 使用配置中的最大记录数
      const maxItems = this.data.config?.maxHistoryItems || 50
      if (history.length > maxItems) {
        history = history.slice(0, maxItems)
      }
      
      // 保存到本地存储
      wx.setStorageSync('scanHistory', history)
    } catch (err) {
      console.error('保存历史记录失败：', err)
      wx.showToast({
        title: '保存历史失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 权限相关方法
  checkCameraAuth() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera'] === false) {
          wx.showModal({
            title: '提示',
            content: '需要相机权限才能扫码，是否去设置？',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        }
      }
    })
  }
})