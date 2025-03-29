Page({
  data: {
    historyList: [], // 存储扫码历史记录
    isLoading: false // 加载状态
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    // 每次页面显示时更新历史记录
    this.loadHistory()
  },

  // 加载历史记录
  loadHistory() {
    this.setData({ isLoading: true })
    try {
      const history = wx.getStorageSync('scanHistory') || []
      
      // 对历史记录进行分组（按日期）
      const groupedHistory = this.groupHistoryByDate(history)
      
      this.setData({
        historyList: history,
        groupedHistoryList: groupedHistory
      })
    } catch (err) {
      console.error('加载历史记录失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 按日期对历史记录进行分组
  groupHistoryByDate(history) {
    const groups = {}
    
    history.forEach(item => {
      const date = item.time.split(' ')[0] // 获取日期部分
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
    })
    
    return Object.entries(groups).map(([date, items]) => ({
      date,
      items
    }))
  },

  // 处理URL类型的结果
  handleUrlResult(url) {
    // 如果url是对象，提取实际的URL
    if (typeof url === 'object') {
      url = url.result || url.displayText || ''
    }

    // 检查URL是否完整
    if (url && !url.startsWith('http')) {
      url = 'http://' + url
    }

    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showModal({
          title: '提示',
          content: '链接已复制到剪贴板，请在手机浏览器中粘贴访问',
          showCancel: false,
          confirmText: '知道了'
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制链接失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 长按历史记录项
  onLongPress(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.historyList[index]
    
    // 根据不同类型显示不同的操作选项
    let itemList = []
    if (item.type === 'url') {
      itemList = ['复制链接', '删除记录']
    } else {
      itemList = ['复制内容', '删除记录']
    }
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        if (item.type === 'url') {
          switch(res.tapIndex) {
            case 0: // 复制链接
              const url = this.getUrlFromItem(item)
              this.copyToClipboard(url, '链接')
              break
            case 1: // 删除记录
              this.deleteHistoryItem(index)
              break
          }
        } else {
          switch(res.tapIndex) {
            case 0: // 复制内容
              this.copyHistoryItem(e)
              break
            case 1: // 删除记录
              this.deleteHistoryItem(index)
              break
          }
        }
      }
    })
  },

  // 从URL类型的记录中获取实际URL
  getUrlFromItem(item) {
    let url = ''
    if (typeof item.result === 'object') {
      url = item.result.result || item.result.displayText || ''
    } else {
      url = item.result || ''
    }
    
    // 确保URL格式正确
    if (url && !url.startsWith('http')) {
      url = 'http://' + url
    }
    
    return url
  },

  // 删除单条历史记录
  deleteHistoryItem(index) {
    wx.showModal({
      title: '提示',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          let history = [...this.data.historyList]
          history.splice(index, 1)
          
          // 保存到本地存储
          wx.setStorageSync('scanHistory', history)
          
          // 重新生成分组数据
          const groupedHistory = this.groupHistoryByDate(history)
          
          // 更新状态
          this.setData({
            historyList: history,
            groupedHistoryList: groupedHistory
          })
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
        }
      }
    })
  },

  // 清空历史记录
  // 复制历史记录内容
  copyHistoryItem(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.historyList[index]
    
    // 确保内容不为空
    if (!item || !item.result) {
      wx.showToast({
        title: '复制内容为空',
        icon: 'none',
        duration: 1500
      })
      return
    }

    // 根据不同类型处理复制内容
    switch (item.type) {
      case 'wifi':
        this.showWifiActionSheet(item.result)
        break
      
      case 'barcode':
        const barcodeText = item.result.displayText || `${item.result.codeText}: ${item.result.result}`
        this.copyToClipboard(barcodeText)
        break
      
      case 'url':
        const url = this.getUrlFromItem(item)
        this.copyToClipboard(url, '链接')
        break
      
      default:
        // 如果有displayText就使用它，否则尝试使用result的文本值
        const content = item.result.displayText || 
                       (typeof item.result === 'object' ? item.result.result : item.result)
        this.copyToClipboard(content)
    }
  },

  // 显示WiFi操作菜单
  showWifiActionSheet(wifiInfo) {
    wx.showActionSheet({
      itemList: ['复制WiFi名称', '复制WiFi密码', '复制全部信息'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.copyToClipboard(wifiInfo.ssid, 'WiFi名称')
            break
          case 1:
            this.copyToClipboard(wifiInfo.password, 'WiFi密码')
            break
          case 2:
            const fullInfo = `WiFi名称：${wifiInfo.ssid}\nWiFi密码：${wifiInfo.password}`
            this.copyToClipboard(fullInfo, '全部信息')
            break
        }
      }
    })
  },

  // 通用复制方法
  copyToClipboard(content, type = '') {
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: type ? `已复制${type}` : '已复制',
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

  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除存储
          wx.removeStorageSync('scanHistory')
          
          // 更新状态
          this.setData({
            historyList: [],
            groupedHistoryList: []
          })
          
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  }
})