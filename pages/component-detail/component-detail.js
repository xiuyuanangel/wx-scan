
Page({
  data: {
    groupId: '', // 分组ID
    groupInfo: {}, // 分组信息
    components: [], // 元件列表
    showComponentForm: false, // 是否显示元件表单
    formData: { // 表单数据
      type: '',
      model: '',
      params: '',
      notes: '',
      quantity: ''
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        groupId: options.id
      });
      this.loadGroupInfo();
      this.loadComponents();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载分组信息
  loadGroupInfo() {
    const groups = wx.getStorageSync('component_groups') || [];
    const group = groups.find(g => g.id === this.data.groupId);
    
    if (group) {
      this.setData({
        groupInfo: group
      });
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: group.name || '分组详情'
      });
    }
  },

  // 加载元件列表
  loadComponents() {
    // 从本地存储获取该分组的元件列表
    const components = wx.getStorageSync(`components_${this.data.groupId}`) || [];
    this.setData({
      components: components
    });
    // 更新分组元件总数
    this.updateGroupComponentCount();
  },

  // 页面显示时刷新数据
  onShow() {
    this.loadComponents();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadGroupInfo();
    this.loadComponents();
    wx.stopPullDownRefresh();
  },

  // 显示添加元件表单
  showAddComponent() {
    this.setData({
      showComponentForm: true,
      formData: {
        type: '',
        model: '',
        params: '',
        notes: '',
        quantity: ''
      }
    });
  },

  // 隐藏元件表单
  hideComponentForm() {
    this.setData({
      showComponentForm: false
    });
  },

  // 处理输入
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 保存元件
  // 阻止事件冒泡
  stopPropagation(e) {
    e.stopPropagation();
  },

  // 编辑元件
  editComponent(e) {
    const { id } = e.currentTarget.dataset;
    const component = this.data.components.find(c => c.id === id);
    if (component) {
      this.setData({
        showComponentForm: true,
        formData: {
          type: component.type,
          model: component.model,
          params: component.params,
          notes: component.notes,
          quantity: component.quantity.toString(),
          id: component.id // 保存ID用于更新
        }
      });
    }
  },

  // 增加数量
  increaseQuantity(e) {
    const { id } = e.currentTarget.dataset;
    const components = this.data.components.map(c => {
      if (c.id === id) {
        return { ...c, quantity: c.quantity + 1 };
      }
      return c;
    });
    
    this.setData({ components });
    wx.setStorageSync(`components_${this.data.groupId}`, components);
    this.updateGroupComponentCount();
  },

  // 减少数量
  decreaseQuantity(e) {
    const { id } = e.currentTarget.dataset;
    const components = this.data.components.map(c => {
      if (c.id === id && c.quantity > 1) {
        return { ...c, quantity: c.quantity - 1 };
      }
      return c;
    });
    
    this.setData({ components });
    wx.setStorageSync(`components_${this.data.groupId}`, components);
    this.updateGroupComponentCount();
  },

  // 删除元件
  deleteComponent(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个元件吗？',
      success: (res) => {
        if (res.confirm) {
          const components = this.data.components.filter(c => c.id !== id);
          this.setData({ components });
          wx.setStorageSync(`components_${this.data.groupId}`, components);
          this.updateGroupComponentCount();
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  saveComponent() {
    const { formData } = this.data;
    
    // 验证输入
    if (!formData.type) {
      wx.showToast({
        title: '请输入元件类型',
        icon: 'none'
      });
      return;
    }
    if (!formData.model) {
      wx.showToast({
        title: '请输入元件型号',
        icon: 'none'
      });
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      wx.showToast({
        title: '请输入有效数量',
        icon: 'none'
      });
      return;
    }

    // 创建或更新元件对象
    const componentData = {
      type: formData.type,
      model: formData.model,
      params: formData.params || '',
      notes: formData.notes || '',
      quantity: parseInt(formData.quantity),
      createTime: formData.id ? undefined : new Date().getTime()
    };

    if (formData.id) {
      // 更新现有元件
      componentData.id = formData.id;
    } else {
      // 创建新元件
      componentData.id = this.generateComponentId();
    }

    // 获取现有元件列表
    let components = wx.getStorageSync(`components_${this.data.groupId}`) || [];
    
    if (formData.id) {
      // 更新现有元件
      const index = components.findIndex(c => c.id === formData.id);
      if (index !== -1) {
        components[index] = componentData;
      }
    } else {
      // 检查是否存在相同型号的元件
      const existingIndex = components.findIndex(c => c.type === componentData.type && c.model === componentData.model);
      
      if (existingIndex !== -1) {
        // 如果存在相同型号，更新数量
        components[existingIndex].quantity += componentData.quantity;
      } else {
        // 添加新元件
        components.unshift(componentData);
      }
    }
    
    // 保存到存储
    wx.setStorageSync(`components_${this.data.groupId}`, components);

    // 更新分组中的元件数量
    this.updateGroupComponentCount();
    
    // 刷新列表并关闭表单
    this.setData({
      components: components,
      showComponentForm: false
    });

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 生成元件ID
  generateComponentId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `C${timestamp}${random}`;
  },

  // 更新分组中的元件数量
  updateGroupComponentCount() {
    const components = wx.getStorageSync(`components_${this.data.groupId}`) || [];
    
    // 计算元件种类数量和总数量
    const typeCount = components.length; // 元件种类数量
    const totalCount = components.reduce((sum, component) => {
      const quantity = parseInt(component.quantity) || 0;
      return sum + quantity;
    }, 0);

    const groups = wx.getStorageSync('component_groups') || [];
    const index = groups.findIndex(g => g.id === this.data.groupId);
    
    if (index !== -1) {
      // 更新分组中的统计信息
      groups[index].typeCount = typeCount;
      groups[index].totalCount = totalCount;
      wx.setStorageSync('component_groups', groups);
      
      // 更新当前页面的分组信息
      this.setData({
        'groupInfo.typeCount': typeCount,
        'groupInfo.totalCount': totalCount,
        components: components
      });

      // 通知页面更新
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.refreshData) {
        prevPage.refreshData();
      }
    }
  }
})