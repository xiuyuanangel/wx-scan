
Page({
  data: {
    productList: [], // 商品列表
    editProduct: null, // 正在编辑的商品
    showForm: false, // 是否显示表单
    formData: {
      barcode: '',
      name: '',
      price: ''
    }
  },

  onLoad(options) {
    this.loadProducts()

    // 如果有条码参数，检查是否已存在并打开表单
    if (options.barcode) {
      const products = wx.getStorageSync('products') || {}
      const existingProduct = products[options.barcode]
      
      this.setData({
        showForm: true,
        formData: {
          barcode: options.barcode,
          name: existingProduct ? existingProduct.name : '',
          price: existingProduct ? existingProduct.price.toString() : ''
        },
        editProduct: existingProduct ? options.barcode : null,
        fromScanner: options.from === 'scanner' // 记录来源
      })
    }

    // 监听键盘高度变化
    wx.onKeyboardHeightChange(res => {
      const keyboardHeight = res.height
      const query = wx.createSelectorQuery()
      query.select('.form-content').boundingClientRect()
      query.exec(rects => {
        if (rects[0]) {
          const contentHeight = rects[0].height
          const scrollTop = Math.max(0, keyboardHeight - contentHeight + 100)
          if (scrollTop > 0) {
            wx.pageScrollTo({
              scrollTop: scrollTop,
              duration: 300
            })
          }
        }
      })
    })
  },

  onShow() {
    this.loadProducts()
  },

  // 加载商品列表
  loadProducts() {
    const products = wx.getStorageSync('products') || {}
    console.log('加载的商品列表：', products)
    
    // 将对象转换为数组
    const productList = Object.keys(products).map(barcode => ({
      barcode: barcode,
      name: products[barcode].name,
      price: products[barcode].price
    }))

    this.setData({ productList })
  },

  // 添加商品
  addProduct() {
    this.setData({
      showForm: true,
      formData: {
        barcode: '',
        name: '',
        price: ''
      },
      editProduct: null
    })
  },

  // 扫码输入
  scanBarcode() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['barCode'],
      success: (res) => {
        const barcode = res.result
        const products = wx.getStorageSync('products') || {}
        const existingProduct = products[barcode]
        
        this.setData({
          formData: {
            barcode: barcode,
            name: existingProduct ? existingProduct.name : '',
            price: existingProduct ? existingProduct.price.toString() : ''
          },
          editProduct: existingProduct ? barcode : null
        })
      }
    })
  },

  // 输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({
      [`formData.${field}`]: value
    })

    // 如果是条码输入，检查是否存在
    if (field === 'barcode' && value) {
      const products = wx.getStorageSync('products') || {}
      const existingProduct = products[value]
      
      if (existingProduct) {
        this.setData({
          formData: {
            barcode: value,
            name: existingProduct.name,
            price: existingProduct.price.toString()
          },
          editProduct: value
        })
      }
    }

    // 如果是名称或价格输入框，处理滚动
    if (field === 'name' || field === 'price') {
      // 立即触发一次滚动
      this.handleInputScroll(field)
      
      // 300ms后再次触发滚动，确保在键盘完全弹出后正确定位
      setTimeout(() => {
        this.handleInputScroll(field)
      }, 300)
      
      // 600ms后再次触发，处理某些系统键盘动画较慢的情况
      setTimeout(() => {
        this.handleInputScroll(field)
      }, 600)
    }
  },

  // 处理输入框滚动
  handleInputScroll(field) {
    const query = wx.createSelectorQuery()
    query.select(`.form-item input[data-field="${field}"]`).boundingClientRect()
    query.selectViewport().boundingClientRect()
    query.exec(res => {
      if (res[0] && res[1]) {
        const inputRect = res[0]
        const viewportHeight = res[1].height
        const systemInfo = wx.getSystemInfoSync()
        
        // 获取系统信息
        const system = systemInfo.system.toLowerCase()
        // 针对不同系统设置不同的安全距离
        const safeDistance = system.includes('harmonyos') ? 250 : 150
        
        // 计算键盘高度
        let keyboardHeight
        if (system.includes('harmonyos')) {
          // 鸿蒙系统使用更大的预估键盘高度
          keyboardHeight = systemInfo.screenHeight * 0.4
        } else {
          keyboardHeight = systemInfo.screenHeight - systemInfo.windowHeight
        }
        
        // 计算需要滚动的距离
        const scrollTop = inputRect.top - (viewportHeight - keyboardHeight) + safeDistance
        
        if (scrollTop > 0) {
          wx.pageScrollTo({
            scrollTop: scrollTop,
            duration: 100  // 减少动画时间，使滚动更快响应
          })
        }
      }
    })
  },

  // 保存商品
  saveProduct() {
    const { barcode, name, price } = this.data.formData
    
    // 验证输入
    if (!barcode || !name || !price) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    // 验证价格格式
    if (!/^\d+(\.\d{0,2})?$/.test(price)) {
      wx.showToast({
        title: '请输入正确的价格',
        icon: 'none'
      })
      return
    }

    // 更新商品列表
    const products = { ...this.data.products }
    products[barcode] = {
      name,
      price: parseFloat(price)
    }

    // 保存到存储
    wx.setStorageSync('products', products)
    this.setData({
      products,
      showForm: false
    })

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      showForm: false,
      editProduct: null
    })
  },

  // 编辑商品
  editProduct(e) {
    const { barcode } = e.currentTarget.dataset
    const products = wx.getStorageSync('products') || {}
    const product = products[barcode]
    
    if (product) {
      this.setData({
        showForm: true,
        editProduct: barcode,
        formData: {
          barcode,
          name: product.name,
          price: product.price.toString()
        }
      })
    }
  },

  // 删除商品
  deleteProduct(e) {
    const { barcode } = e.currentTarget.dataset
    
    wx.showModal({
      title: '提示',
      content: '确定要删除此商品吗？',
      success: (res) => {
        if (res.confirm) {
          const products = wx.getStorageSync('products') || {}
          delete products[barcode]
          
          wx.setStorageSync('products', products)
          this.loadProducts() // 重新加载列表
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
        }
      }
    })
  },

  // 保存商品
  saveProduct() {
    const { barcode, name, price } = this.data.formData
    
    // 验证输入
    if (!barcode || !name || !price) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    // 验证价格格式
    if (!/^\d+(\.\d{0,2})?$/.test(price)) {
      wx.showToast({
        title: '请输入正确的价格',
        icon: 'none'
      })
      return
    }

    // 更新商品列表
    const products = wx.getStorageSync('products') || {}
    products[barcode] = {
      name,
      price: parseFloat(price)
    }

    // 保存到存储并刷新列表
    wx.setStorageSync('products', products)
    this.loadProducts()
    
    this.setData({
      showForm: false,
      editProduct: null
    })

    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1000,
      success: () => {
        // 如果是从扫码页面来的，保存后返回
        if (this.data.fromScanner) {
          setTimeout(() => {
            wx.navigateBack()
          }, 1000)
        }
      }
    })
  }
})