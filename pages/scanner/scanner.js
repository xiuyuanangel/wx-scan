
Page({
  data: {
    scanList: [], // 扫码商品列表
    totalAmount: 0, // 总金额
  },

  onLoad() {
    // 页面加载时从缓存恢复数据
    const scanList = wx.getStorageSync('scanList') || []
    this.setData({
      scanList: scanList
    })
    this.calculateTotal()
  },

  // 添加扫码
  addScan() {
    wx.scanCode({
      onlyFromCamera: true, // 只允许相机扫码
      scanType: ['barCode'], // 只扫描条形码
      success: (res) => {
        console.log('扫码成功：', res)
        // 获取商品信息
        this.getProductInfo(res.result)
      },
      fail: (err) => {
        console.error('扫码失败：', err)
        wx.showToast({
          title: '扫码失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 获取商品信息
  getProductInfo(barcode) {
    // 从本地存储获取商品信息
    const products = wx.getStorageSync('products') || {}
    const product = products[barcode]

    if (product) {
      // 添加到扫码列表
      this.addToScanList(barcode, product.name, product.price)
    } else {
      // 保存当前条码到全局数据
      getApp().globalData.pendingBarcode = barcode
      
      // 跳转到商品添加页面
      wx.navigateTo({
        url: `/pages/product/product?barcode=${barcode}&from=scanner`,
        fail: (err) => {
          console.error('跳转失败：', err)
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          })
        }
      })
    }
  },

  // 处理商品添加页面返回
  onShow() {
    const app = getApp()
    const pendingBarcode = app.globalData.pendingBarcode
    
    if (pendingBarcode) {
      // 检查商品是否已添加
      const products = wx.getStorageSync('products') || {}
      const product = products[pendingBarcode]
      
      if (product) {
        // 添加到扫码列表
        this.addToScanList(pendingBarcode, product.name, product.price)
      }
      
      // 清除待处理的条码
      app.globalData.pendingBarcode = null
    }
  },

  // 添加到扫码列表
  addToScanList(barcode, name, price) {
    const scanList = [...this.data.scanList]
    // 查找是否已存在相同商品
    const existingIndex = scanList.findIndex(item => item.barcode === barcode)

    if (existingIndex !== -1) {
      // 如果商品已存在，增加数量
      scanList[existingIndex].quantity = (scanList[existingIndex].quantity || 1) + 1
      scanList[existingIndex].time = this.formatTime(new Date()) // 更新时间
    } else {
      // 如果是新商品，添加到列表
      scanList.push({
        id: Date.now(),
        barcode: barcode,
        name: name,
        price: price,
        quantity: 1,
        time: this.formatTime(new Date())
      })
    }

    this.setData({ scanList })
    wx.setStorageSync('scanList', scanList)
    this.calculateTotal()

    wx.showToast({
      title: existingIndex !== -1 ? '数量+1' : '添加成功',
      icon: 'success'
    })
  },

  // 更新商品数量
  updateQuantity(e) {
    const { index, type } = e.currentTarget.dataset
    const scanList = [...this.data.scanList]
    const item = scanList[index]
    
    if (type === 'plus') {
      item.quantity = (item.quantity || 1) + 1
    } else if (type === 'minus') {
      if (item.quantity > 1) {
        item.quantity -= 1
      } else {
        return
      }
    }

    this.setData({ scanList })
    wx.setStorageSync('scanList', scanList)
    this.calculateTotal()
  },

  // 计算总金额
  calculateTotal() {
    const total = this.data.scanList.reduce((sum, item) => {
      const quantity = item.quantity || 1
      return sum + (item.price * quantity)
    }, 0)
    this.setData({
      totalAmount: total.toFixed(2)
    })
  },

  // 删除商品
  deleteItem(e) {
    const index = e.currentTarget.dataset.index
    const scanList = [...this.data.scanList]
    scanList.splice(index, 1)
    
    this.setData({ scanList })
    wx.setStorageSync('scanList', scanList)
    this.calculateTotal()
  },

  // 清空列表
  clearList() {
    wx.showModal({
      title: '提示',
      content: '确定要清空列表吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            scanList: [],
            totalAmount: '0.00'
          })
          wx.setStorageSync('scanList', [])
        }
      }
    })
  },

  // 格式化时间
  formatTime(date) {
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    return [hour, minute, second].map(n => n.toString().padStart(2, '0')).join(':')
  }
})