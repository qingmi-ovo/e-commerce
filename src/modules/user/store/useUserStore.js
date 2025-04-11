import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import { authAPI } from '../../../api/user/auth'
import { profileAPI } from '../../../api/user/profile'
import { addressAPI } from '../../../api/user/address'

/**
 * 用户状态管理
 */
export const useUserStore = defineStore('user', () => {
  // 用户详细信息
  const userProfile = reactive({
    userId: localStorage.getItem('userId') || '',
    username: localStorage.getItem('username') || '',
    nickname: localStorage.getItem('userName') || '',
    email: localStorage.getItem('userEmail') || '',
    gender: parseInt(localStorage.getItem('userGender') || '0'),
    birthday: localStorage.getItem('userBirthday') || '',
    bio: localStorage.getItem('userBio') || '',
    mobile: localStorage.getItem('userMobile') || '',
    avatar: localStorage.getItem('userAvatar') || '',
    role: localStorage.getItem('userRole') || 'user'
  })

  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = reactive({
    name: userProfile.nickname || userProfile.username || '',
    avatar: userProfile.avatar || '',
    mobile: userProfile.mobile || ''
  })

  // 从localStorage加载地址列表
  const loadAddressesFromStorage = () => {
    try {
      const savedAddresses = localStorage.getItem('userAddresses')
      return savedAddresses ? JSON.parse(savedAddresses) : []
    } catch (error) {
      console.error('加载本地地址失败:', error)
      return []
    }
  }
  
  // 判断两个地址是否实际上是同一个地址
  const isSameAddress = (addr1, addr2) => {
    // 如果ID相同，肯定是同一个地址
    if (addr1.id === addr2.id) return true
    
    // 比较关键字段是否相同
    return addr1.name === addr2.name && 
           addr1.mobile === addr2.mobile &&
           addr1.province === addr2.province &&
           addr1.city === addr2.city &&
           addr1.district === addr2.district &&
           addr1.address === addr2.address
  }
  
  // 移除数组中的重复地址
  const removeDuplicateAddresses = (addresses) => {
    if (!addresses || !Array.isArray(addresses)) return []
    
    const uniqueAddresses = []
    const seenAddresses = new Set()
    let hasDefaultAddress = false
    
    // 首先添加所有非本地添加的地址（API返回的地址）
    addresses.forEach(addr => {
      if (!addr.isLocalAdded) {
        // 创建地址的唯一键
        const addressKey = `${addr.name}:${addr.mobile}:${addr.province}:${addr.city}:${addr.district}:${addr.address}`
        if (!seenAddresses.has(addressKey)) {
          // 检查是否为默认地址
          if (addr.isDefault) {
            // 如果已经有默认地址，将当前地址的默认标志设为false
            if (hasDefaultAddress) {
              addr = { ...addr, isDefault: false }
            } else {
              hasDefaultAddress = true
            }
          }
          
          seenAddresses.add(addressKey)
          uniqueAddresses.push(addr)
        }
      }
    })
    
    // 然后添加本地添加的地址，但避免与已添加的地址重复
    addresses.forEach(addr => {
      if (addr.isLocalAdded) {
        const addressKey = `${addr.name}:${addr.mobile}:${addr.province}:${addr.city}:${addr.district}:${addr.address}`
        if (!seenAddresses.has(addressKey)) {
          // 检查是否为默认地址
          if (addr.isDefault) {
            // 如果已经有默认地址，将当前地址的默认标志设为false
            if (hasDefaultAddress) {
              addr = { ...addr, isDefault: false }
            } else {
              hasDefaultAddress = true
            }
          }
          
          seenAddresses.add(addressKey)
          uniqueAddresses.push(addr)
        }
      }
    })
    
    return uniqueAddresses
  }

  // 初始化时自动清理重复地址
  const cleanupAddressesOnLoad = () => {
    try {
      // 从localStorage读取地址数据
      const savedAddresses = localStorage.getItem('userAddresses')
      if (savedAddresses) {
        const parsedAddresses = JSON.parse(savedAddresses)
        const originalCount = parsedAddresses.length
        
        // 去重
        const uniqueAddresses = removeDuplicateAddresses(parsedAddresses)
        const newCount = uniqueAddresses.length
        
        // 如果发现重复，更新回localStorage
        if (originalCount > newCount) {
          console.log(`应用启动时检测到${originalCount - newCount}个重复地址，自动清理`)
          localStorage.setItem('userAddresses', JSON.stringify(uniqueAddresses))
          return uniqueAddresses
        }
        
        return parsedAddresses
      }
    } catch (error) {
      console.error('自动清理地址失败:', error)
    }
    return []
  }

  // 初始化地址列表，优先从localStorage加载并自动去重
  const addresses = ref(cleanupAddressesOnLoad())

  // 确保地址列表中只有一个默认地址
  const ensureSingleDefaultAddress = (addresses) => {
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) return
    
    // 先检查是否已有默认地址
    const defaultAddresses = addresses.filter(addr => addr.isDefault)
    
    // 如果没有默认地址且地址列表不为空，可以考虑将第一个地址设为默认
    if (defaultAddresses.length === 0) {
      // 这里不主动设置默认，避免刷新页面时改变用户设置
      console.log('没有发现默认地址，保持当前状态')
      return
    }
    
    // 如果有多个默认地址，只保留一个（优先保留非本地添加的）
    if (defaultAddresses.length > 1) {
      console.log(`发现${defaultAddresses.length}个默认地址，需要修正`)
      
      // 优先选择非本地添加的地址作为默认
      const apiDefault = defaultAddresses.find(addr => !addr.isLocalAdded)
      
      // 如果有API返回的默认地址，使用它；否则使用第一个默认地址
      const keepDefault = apiDefault || defaultAddresses[0]
      console.log('保留的默认地址:', {
        id: keepDefault.id, 
        isLocalAdded: keepDefault.isLocalAdded
      })
      
      // 修正所有地址的默认状态
      for (let i = 0; i < addresses.length; i++) {
        if (addresses[i].isDefault && addresses[i].id !== keepDefault.id) {
          console.log(`将地址 ${addresses[i].id} 的默认状态设为false`)
          addresses[i] = { ...addresses[i], isDefault: false }
        }
      }
    }
  }

  // 立即检查地址数据是否正确加载
  const checkAndFixAddresses = () => {
    // 确保地址是ref对象且有值
    if (!addresses.value) {
      addresses.value = []
    }
    
    // 检查localStorage中的地址数据
    const localAddresses = loadAddressesFromStorage()
    
    // 如果localStorage中有地址数据但store中没有，则使用localStorage的数据
    if (localAddresses.length > 0 && addresses.value.length === 0) {
      console.log('从localStorage恢复地址数据，共', localAddresses.length, '条')
      addresses.value = localAddresses
      
      // 检查并标记本地添加的地址
      let localAddressCount = 0
      addresses.value.forEach(addr => {
        if (addr.id && addr.id.toString().startsWith('local_')) {
          addr.isLocalAdded = true
          localAddressCount++
        }
      })
      
      if (localAddressCount > 0) {
        console.log(`检测到${localAddressCount}条本地添加的地址，已正确标记`)
      }
    }
    
    // 反之，如果store中有地址数据但localStorage中没有，则保存到localStorage
    if (addresses.value.length > 0 && localAddresses.length === 0) {
      console.log('将当前地址数据保存到localStorage，共', addresses.value.length, '条')
      localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
    }
    
    // 强制确保地址数据保存到localStorage（避免刷新后消失）
    localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
  }

  // 立即执行地址检查，确保数据一致性
  checkAndFixAddresses()
  
  // 登录方法
  const login = async (credentials) => {
    try {
      let result
      
      // 根据传入的凭证类型决定使用哪种登录方式
      if (credentials.username && credentials.password) {
        // 用户名密码登录
        result = await authAPI.loginByPassword(
          credentials.username, 
          credentials.password,
          credentials.captcha,
          credentials.captchaId
        )
      } else if (credentials.mobile && credentials.smsCode) {
        // 短信验证码登录
        result = await authAPI.loginBySMS(
          credentials.mobile, 
          credentials.smsCode,
          credentials.captcha,
          credentials.captchaId
        )
      } else {
        return Promise.reject(new Error('无效的登录参数'))
      }
      
      // 保存token和用户信息
      token.value = result.data.token
      Object.assign(userInfo, {
        name: result.data.nickname || result.data.username,
        avatar: result.data.avatar,
        mobile: result.data.mobile
      })
      
      return result
    } catch (error) {
      return Promise.reject(error)
    }
  }
  
  // 登出方法
  const logout = () => {
    // 清空token
    token.value = ''
    
    // 清空用户详细信息
    Object.assign(userProfile, {
      userId: '',
      username: '',
      nickname: '',
      email: '',
      gender: 0,
      birthday: '',
      bio: '',
      mobile: '',
      avatar: '',
      role: 'user'
    })
    
    // 清空用户基本信息
    Object.assign(userInfo, {
      name: '',
      avatar: '',
      mobile: ''
    })
    
    // 清空地址信息
    addresses.value = []
    
    // 清除localStorage中的用户信息
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userGender')
    localStorage.removeItem('userBirthday')
    localStorage.removeItem('userBio')
    localStorage.removeItem('userAvatar')
    localStorage.removeItem('userMobile')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userAddresses')
    
    console.log('已退出登录，用户信息已清空');
    
    // 可以在这里调用后端登出接口（如果有的话）
    // await authAPI.logout()
  }
  
  // 加载收货地址
  const loadAddresses = async () => {
    try {
      // 优先从localStorage加载地址数据
      const localAddresses = loadAddressesFromStorage()
      console.log('从localStorage获取的地址数据:', localAddresses)
      
      // 去除本地存储中可能的重复地址
      const dedupedLocalAddresses = removeDuplicateAddresses(localAddresses)
      if (dedupedLocalAddresses.length !== localAddresses.length) {
        console.log(`检测到并移除了${localAddresses.length - dedupedLocalAddresses.length}个重复地址`)
        // 立即更新本地存储
        localStorage.setItem('userAddresses', JSON.stringify(dedupedLocalAddresses))
      }
      
      // 先使用去重后的本地数据填充
      if (dedupedLocalAddresses && dedupedLocalAddresses.length > 0) {
        addresses.value = dedupedLocalAddresses
        console.log('已从localStorage加载地址数据（去重后），共', dedupedLocalAddresses.length, '条')
      }
      
      // 未登录时，直接使用本地存储的地址数据
      if (!token.value) {
        return addresses.value
      }
      
      // 记录加载前的地址ID，用于后续比较
      const existingAddressIds = addresses.value.map(addr => addr.id)
      console.log('加载API前的地址ID:', existingAddressIds)
      
      // 记录当前默认地址信息
      let currentDefaultAddress = addresses.value.find(addr => addr.isDefault)
      const hasLocalDefault = currentDefaultAddress && currentDefaultAddress.isLocalAdded
      console.log('当前默认地址信息:', {
        hasDefault: !!currentDefaultAddress,
        isLocalDefault: hasLocalDefault,
        defaultAddressId: currentDefaultAddress ? currentDefaultAddress.id : 'none'
      })
      
      // 尝试从API加载最新数据
      try {
        const result = await addressAPI.fetchAddressList()
        
        // 如果API返回的地址不为空
        if (result && result.data && result.data.length > 0) {
          console.log('从API获取的地址数据:', result.data)
          
          // 确保API返回的地址数据不重复
          const dedupedApiAddresses = removeDuplicateAddresses(result.data)
          
          // 检查API是否返回了默认地址
          const apiDefaultAddress = dedupedApiAddresses.find(addr => addr.isDefault)
          const hasApiDefault = !!apiDefaultAddress
          console.log('API返回的默认地址:', hasApiDefault ? apiDefaultAddress : 'none')
          
          // 找出仅存在于本地的地址（API中没有的）
          // 通过比较多个字段来确定是否为同一地址
          const localOnlyAddresses = addresses.value.filter(localAddr => {
            // 首先检查是否为本地添加的地址
            if (localAddr.isLocalAdded) {
              // 再检查是否与API返回的任何地址匹配（通过内容比较）
              return !dedupedApiAddresses.some(apiAddr => isSameAddress(localAddr, apiAddr))
            }
            return false // 非本地添加的地址不保留
          })
          
          console.log('仅在本地存在的唯一地址数量:', localOnlyAddresses.length)
          
          // 合并API地址和仅在本地的唯一地址
          let mergedAddresses = [...dedupedApiAddresses]
          
          // 只有当本地有唯一地址时才合并
          if (localOnlyAddresses.length > 0) {
            // 在合并前，将本地地址的默认值重置为false，如果API中已经有默认地址
            if (hasApiDefault) {
              localOnlyAddresses.forEach(addr => {
                addr.isDefault = false
              })
            }
            
            mergedAddresses = [...dedupedApiAddresses, ...localOnlyAddresses]
            
            // 再次确保合并后没有重复，且只有一个默认地址
            mergedAddresses = removeDuplicateAddresses(mergedAddresses)
            console.log('合并后的地址数量（去重）:', mergedAddresses.length)
          }
          
          // 处理默认地址优先级：
          // 1. 如果API返回了默认地址，优先使用API的默认地址
          // 2. 如果API没有默认地址但本地有，则保留本地默认地址
          // 3. 如果都没有默认地址，不做特殊处理
          if (hasApiDefault) {
            // API有默认地址，确保只有API指定的地址是默认的
            mergedAddresses.forEach(addr => {
              if (apiDefaultAddress && addr.id === apiDefaultAddress.id) {
                addr.isDefault = true
              } else {
                addr.isDefault = false
              }
            })
            console.log('使用API返回的默认地址:', apiDefaultAddress.id)
          } else if (hasLocalDefault && currentDefaultAddress) {
            // API没有默认地址但本地有，保留本地默认
            let foundLocalDefault = false
            mergedAddresses.forEach(addr => {
              if (addr.id === currentDefaultAddress.id) {
                addr.isDefault = true
                foundLocalDefault = true
                console.log('保留本地默认地址:', addr.id)
              } else {
                addr.isDefault = false
              }
            })
            
            // 如果找不到原本的本地默认地址（可能已删除），则不设置默认
            if (!foundLocalDefault) {
              console.log('未找到原本的本地默认地址，不设置默认地址')
            }
          } else {
            // 确保只有一个默认地址
            ensureSingleDefaultAddress(mergedAddresses)
          }
          
          // 更新地址数据
          addresses.value = mergedAddresses
          
          // 同步到localStorage
          localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
          console.log('已将合并的地址数据同步到localStorage，共', addresses.value.length, '条')
          
          // 打印最终默认地址状态
          const finalDefault = addresses.value.find(addr => addr.isDefault)
          console.log('最终默认地址:', finalDefault ? {
            id: finalDefault.id,
            name: finalDefault.name,
            isLocalAdded: finalDefault.isLocalAdded
          } : '无默认地址')
        } else if (addresses.value.length === 0) {
          // 如果API没有返回地址数据，且当前没有地址，则尝试从localStorage恢复
          addresses.value = dedupedLocalAddresses
          console.log('API返回空地址列表，使用localStorage中的地址数据')
        }
      } catch (apiError) {
        console.error('API加载地址失败:', apiError)
        // API调用失败时保持使用localStorage的数据
      }
      
      return addresses.value
    } catch (error) {
      console.error('加载收货地址失败:', error)
      
      // 加载失败时，尝试使用本地存储的地址数据
      const localAddresses = loadAddressesFromStorage()
      if (localAddresses && localAddresses.length > 0) {
        // 去重后使用
        const dedupedAddresses = removeDuplicateAddresses(localAddresses)
        addresses.value = dedupedAddresses
        // 更新回localStorage
        localStorage.setItem('userAddresses', JSON.stringify(dedupedAddresses))
        console.log('加载失败，使用localStorage中的地址数据（去重后），共', dedupedAddresses.length, '条')
      }
      
      return Promise.reject(error)
    }
  }
  
  // 更新收货地址
  const updateAddress = async (id, addressData) => {
    try {
      if (!token.value) return Promise.reject(new Error('未登录'))
      
      console.log('开始更新地址:', id, addressData)
      
      // 检查是否为本地添加的地址
      const isLocalAddress = id && id.toString().startsWith('local_');
      console.log('是否为本地添加的地址:', isLocalAddress)
      
      // 确保ID有效
      if (!id) {
        console.error('更新地址失败: 地址ID为空');
        return Promise.reject(new Error('更新地址失败: 地址ID为空'));
      }
      
      // 日志记录更新前的地址列表
      console.log('更新前的地址列表:', JSON.stringify(addresses.value.map(addr => ({ id: addr.id, name: addr.name }))));
      
      // 检查更新后是否与其他地址重复(除了当前要更新的地址)
      const otherAddresses = addresses.value.filter(addr => addr.id !== id)
      const willDuplicate = otherAddresses.some(addr => 
        addr.name === addressData.name &&
        addr.mobile === addressData.mobile &&
        addr.province === addressData.province &&
        addr.city === addressData.city &&
        addr.district === addressData.district &&
        addr.address === addressData.address
      )
      
      if (willDuplicate) {
        console.warn('更新后的地址与已有地址重复')
        return Promise.reject(new Error('更新后的地址与已有地址重复，请修改后再保存'))
      }
      
      // 如果设置为默认地址，需要先将其他地址的默认标记去除
      if (addressData.isDefault) {
        addresses.value.forEach(addr => {
          if (addr.id !== id && addr.isDefault) {
            addr.isDefault = false
          }
        })
      }
      
      try {
        let updatedAddress;
        
        // 首先检查ID是否在列表中
        const existingAddressIndex = addresses.value.findIndex(addr => addr.id === id);
        if (existingAddressIndex === -1) {
          console.log('⚠️ 警告: 要更新的地址ID不在当前列表中:', id);
          
          // 检查是否可以通过内容找到匹配的地址
          const matchedByContent = addresses.value.find(addr => 
            addr.name === addressData.name && 
            addr.phone === addressData.phone);
          
          if (matchedByContent) {
            console.log('✅ 通过内容找到匹配的地址:', matchedByContent.id);
            id = matchedByContent.id; // 使用找到的地址ID
          } else {
            console.log('❌ 未找到要更新的地址，将作为新地址添加');
            // 保留原始ID，但要保证ID有效
            if (!id || addresses.value.some(addr => addr.id === id)) {
              id = `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
              console.log('🆕 为新地址生成ID:', id);
            }
            addressData.id = id;
            addressData.isLocalAdded = true;
            const result = await addAddress(addressData);
            return result;
          }
        }
        
        // 如果是本地添加的地址，跳过API调用
        if (isLocalAddress) {
          console.log('本地添加的地址，直接在本地更新')
          // 直接在本地更新
          const index = addresses.value.findIndex(addr => addr.id === id)
          if (index !== -1) {
            // 保留原有的id和本地标记
            updatedAddress = { 
              ...addresses.value[index], 
              ...addressData, 
              id,
              isLocalAdded: true,
              lastUpdated: new Date().toISOString() 
            }
            // 使用新数组替换，确保Vue检测到变化
            const newAddresses = [...addresses.value];
            newAddresses[index] = updatedAddress;
            addresses.value = newAddresses;
            
            // 确保只有一个默认地址
            ensureSingleDefaultAddress(addresses.value)
            
            // 去重后同步到localStorage
            addresses.value = removeDuplicateAddresses(addresses.value)
            localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
            console.log('本地地址更新成功并保存到localStorage')
            
            return updatedAddress
          } else {
            console.error('未找到要更新的地址:', id);
            return Promise.reject(new Error('未找到要更新的地址'));
          }
        } else {
          // 非本地地址，调用API
          try {
            const result = await addressAPI.updateAddress(id, addressData)
            
            // 更新本地状态
            const index = addresses.value.findIndex(addr => addr.id === id)
            if (index !== -1) {
              updatedAddress = { 
                ...result.data, 
                id,
                lastUpdated: new Date().toISOString()
              } // 确保ID保持不变
              
              // 使用新数组替换，确保Vue检测到变化
              const newAddresses = [...addresses.value];
              newAddresses[index] = updatedAddress;
              addresses.value = newAddresses;
              
              // 确保只有一个默认地址
              ensureSingleDefaultAddress(addresses.value)
              
              // 去重后立即同步到localStorage
              addresses.value = removeDuplicateAddresses(addresses.value)
              localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
              console.log('地址更新成功，已同步到localStorage，地址数量:', addresses.value.length)
              
              return updatedAddress
            } else {
              console.error('API调用成功但未找到要更新的地址:', id);
              return Promise.reject(new Error('未找到要更新的地址'));
            }
          } catch (apiError) {
            console.error('更新地址API调用失败:', apiError)
            
            // API调用失败，直接在本地更新地址
            const index = addresses.value.findIndex(addr => addr.id === id)
            if (index !== -1) {
              // 创建更新后的地址对象，保留原ID和本地标记
              const wasLocallyAdded = addresses.value[index].isLocalAdded || false;
              updatedAddress = { 
                ...addresses.value[index], 
                ...addressData, 
                id,
                isLocalAdded: true, // 强制标记为本地更新，确保持久化
                lastUpdated: new Date().toISOString()
              }
              
              // 使用新数组替换，确保Vue检测到变化
              const newAddresses = [...addresses.value];
              newAddresses[index] = updatedAddress;
              addresses.value = newAddresses;
              
              // 确保只有一个默认地址
              ensureSingleDefaultAddress(addresses.value)
              
              // 去重后立即同步到localStorage
              addresses.value = removeDuplicateAddresses(addresses.value)
              localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
              console.log('API更新失败，但已在本地更新地址并保存到localStorage')
              
              return updatedAddress
            } else {
              console.error('API调用失败且未找到要更新的地址:', id);
              return Promise.reject(new Error('未找到要更新的地址'));
            }
          }
        }
      } catch (error) {
        console.error('更新地址处理过程中发生错误:', error);
        return Promise.reject(new Error(`更新地址失败: ${error.message || '未知错误'}`));
      }
    } catch (error) {
      console.error('更新收货地址失败:', error)
      return Promise.reject(error)
    }
  }
  
  // 添加收货地址
  const addAddress = async (addressData) => {
    try {
      if (!token.value) return Promise.reject(new Error('未登录'))
      
      console.log('准备添加新地址:', addressData)
      
      // 先检查该地址是否已存在（内容重复）
      const addressExists = addresses.value.some(addr => 
        addr.name === addressData.name &&
        addr.mobile === addressData.mobile &&
        addr.province === addressData.province &&
        addr.city === addressData.city &&
        addr.district === addressData.district &&
        addr.address === addressData.address
      )
      
      if (addressExists) {
        console.warn('该地址已存在，不再重复添加')
        return Promise.reject(new Error('该地址已存在，不可重复添加'))
      }
      
      // 确保新地址有唯一ID
      if (!addressData.id) {
        // 生成新ID - 为本地添加的地址使用特殊前缀，以便区分
        addressData.id = `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        console.log('为新地址生成ID:', addressData.id);
      }
      
      // 如果设置为默认地址，需要先将其他地址的默认标记去除
      if (addressData.isDefault) {
        addresses.value.forEach(addr => {
          if (addr.isDefault) {
            addr.isDefault = false
          }
        })
      }
      
      // 确保地址对象包含必要的标记
      const newAddressWithId = {
        ...addressData,
        isLocalAdded: true, // 标记为本地添加的地址
        addedTime: new Date().toISOString() // 添加时间戳
      }
      
      console.log('准备添加新地址:', newAddressWithId)
      
      // 在API调用前，先备份当前地址列表
      const backupAddresses = [...addresses.value]
      
      try {
        const result = await addressAPI.addAddress(newAddressWithId)
        
        // 添加新地址到本地状态
        let newAddress;
        
        // 如果API返回了有效的地址数据且有ID，使用API返回的数据
        if (result && result.data && result.data.id) {
          newAddress = {
            ...result.data,
            isLocalAdded: true // 保留本地标记
          }
        } else {
          // 否则使用我们准备的本地地址数据
          newAddress = newAddressWithId
        }
        
        // 再次检查是否有重复（可能API调用过程中添加了相同地址）
        const duplicateCheck = addresses.value.some(addr => isSameAddress(addr, newAddress))
        if (duplicateCheck) {
          console.warn('API调用返回后检测到该地址已存在，不再添加')
          return newAddress // 直接返回，不重复添加
        }
        
        // 创建新数组并添加地址，确保Vue检测到变化
        addresses.value = [newAddress, ...addresses.value]
        
        // 确保只有一个默认地址
        ensureSingleDefaultAddress(addresses.value)
        
        // 对地址列表去重
        addresses.value = removeDuplicateAddresses(addresses.value)
        
        // 立即同步到localStorage
        localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
        console.log('地址添加成功，已保存到localStorage，当前地址数量:', addresses.value.length)
        
        return newAddress
      } catch (error) {
        console.error('添加收货地址API调用失败:', error)
        
        // 再次检查是否有重复
        const duplicateCheck = addresses.value.some(addr => 
          addr.name === addressData.name &&
          addr.mobile === addressData.mobile &&
          addr.province === addressData.province &&
          addr.city === addressData.city &&
          addr.district === addressData.district &&
          addr.address === addressData.address
        )
        
        if (duplicateCheck) {
          console.warn('API调用失败后检测到该地址已存在，不再添加')
          return Promise.reject(new Error('该地址已存在，不可重复添加'))
        }
        
        // API调用失败，直接在本地添加地址
        // 创建新数组并添加地址，确保Vue检测到变化
        addresses.value = [newAddressWithId, ...addresses.value]
        
        // 确保只有一个默认地址
        ensureSingleDefaultAddress(addresses.value)
        
        // 对地址列表去重
        addresses.value = removeDuplicateAddresses(addresses.value)
        
        // 立即同步到localStorage
        localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
        console.log('API调用失败，但已将地址添加到本地存储，当前地址数量:', addresses.value.length)
        
        // 返回本地添加的地址数据
        return newAddressWithId
      }
    } catch (error) {
      console.error('添加收货地址失败:', error)
      return Promise.reject(error)
    }
  }
  
  // 设置默认收货地址
  const setDefaultAddress = async (id) => {
    try {
      if (!token.value) return Promise.reject(new Error('未登录'))
      
      console.log('设置默认地址:', id)
      
      // 检查要设置为默认的地址是否存在
      const targetAddress = addresses.value.find(addr => addr.id === id)
      if (!targetAddress) {
        console.error('要设置为默认的地址不存在:', id)
        return Promise.reject(new Error('要设置为默认的地址不存在'))
      }
      
      // 如果该地址已经是默认地址，无需操作
      if (targetAddress.isDefault) {
        console.log('该地址已经是默认地址，无需重复设置')
        return { success: true }
      }
      
      // 检查是否为本地添加的地址
      const isLocalAddress = id.toString().startsWith('local_')
      console.log('是否为本地添加的地址:', isLocalAddress)
      
      // 保存当前的地址数据，以便API调用失败时恢复
      const originalAddresses = JSON.parse(JSON.stringify(addresses.value))
      
      // 先更新本地状态，提高用户体验的响应速度
      const updatedAddresses = addresses.value.map(addr => ({
        ...addr,
        isDefault: addr.id === id
      }))
      
      // 更新store中的地址 - 使用新数组替换，确保Vue检测到变化
      addresses.value = updatedAddresses
      
      // 立即更新localStorage，确保即使API调用失败也能保持一致性
      localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
      console.log('已更新本地状态，当前默认地址:', id)
      console.log('已将地址数据同步到localStorage，共', addresses.value.length, '条')
      
      try {
        if (isLocalAddress) {
          console.log('本地添加的地址，无需调用API')
          return { success: true }
        } else {
          // 非本地地址，调用API
          try {
            const result = await addressAPI.setDefaultAddress(id)
            console.log('API设置默认地址成功:', result)
            return { success: true }
          } catch (apiError) {
            console.error('API设置默认地址失败，但本地状态已更新:', apiError)
            // 即使API调用失败，也保持本地状态的更新
            
            // 再次确保localStorage已更新
            localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
            console.log('已再次确保localStorage已更新')
            
            return { success: true, isLocalOnly: true }
          }
        }
      } catch (error) {
        console.error('设置默认地址失败:', error)
        return Promise.reject(error)
      }
    } catch (error) {
      console.error('设置默认地址失败:', error)
      return Promise.reject(error)
    }
  }
  
  // 删除收货地址
  const removeAddress = async (id) => {
    try {
      if (!token.value) return Promise.reject(new Error('未登录'))
      
      console.log('开始删除地址:', id)
      
      // 检查地址是否存在
      const targetAddressIndex = addresses.value.findIndex(addr => addr.id === id)
      if (targetAddressIndex === -1) {
        console.error('要删除的地址不存在:', id)
        return Promise.reject(new Error('要删除的地址不存在'))
      }
      
      // 检查是否为本地添加的地址
      const isLocalAddress = id.toString().startsWith('local_');
      console.log('是否为本地添加的地址:', isLocalAddress)
      
      // 在删除前备份地址列表
      const addressBackup = [...addresses.value]
      
      // 如果是本地添加的地址，跳过API调用
      if (isLocalAddress) {
        console.log('本地添加的地址，直接在本地删除')
        // 创建新数组并更新，确保Vue检测到变化
        const newAddresses = addresses.value.filter(addr => addr.id !== id);
        addresses.value = newAddresses;
        
        // 立即同步到localStorage
        localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
        console.log('本地地址删除成功并更新localStorage')
        
        return { success: true, id }
      } else {
        // 非本地地址，调用API
        try {
          await addressAPI.deleteAddress(id)
          
          // 创建新数组并更新，确保Vue检测到变化
          const newAddresses = addresses.value.filter(addr => addr.id !== id);
          addresses.value = newAddresses;
          
          // 立即同步到localStorage
          localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
          console.log('地址删除成功，已同步到localStorage，剩余地址数量:', addresses.value.length)
          
          return { success: true, id }
        } catch (apiError) {
          console.error('删除地址API调用失败:', apiError)
          
          // API调用失败，直接在本地删除地址
          // 创建新数组并更新，确保Vue检测到变化
          const newAddresses = addresses.value.filter(addr => addr.id !== id);
          addresses.value = newAddresses;
          
          // 立即同步到localStorage
          localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
          console.log('API删除失败，但已在本地删除地址并更新localStorage')
          
          return { success: true, id }
        }
      }
    } catch (error) {
      console.error('删除收货地址失败:', error)
      return Promise.reject(error)
    }
  }
  
  // 加载用户信息
  const loadUserInfo = async () => {
    if (!token.value) return Promise.reject(new Error('未登录'))
    
    try {
      const result = await profileAPI.fetchUserProfile()
      
      // 更新用户详细信息
      Object.assign(userProfile, {
        userId: result.data.userId,
        username: result.data.username,
        nickname: result.data.nickname || result.data.username,
        email: result.data.email || userProfile.email,
        gender: result.data.gender !== undefined ? result.data.gender : userProfile.gender,
        birthday: result.data.birthday || userProfile.birthday,
        bio: result.data.bio || userProfile.bio,
        mobile: result.data.mobile || userProfile.mobile,
        avatar: result.data.avatar || userProfile.avatar,
        role: result.data.role || userProfile.role
      })
      
      // 更新用户信息
      Object.assign(userInfo, {
        name: userProfile.nickname || userProfile.username,
        avatar: userProfile.avatar,
        mobile: userProfile.mobile
      })
      
      console.log('加载用户信息成功，头像:', userInfo.avatar);
      console.log('加载用户详细信息成功:', userProfile);
      
      return result.data
    } catch (error) {
      console.error('加载用户信息失败:', error)
      return Promise.reject(error)
    }
  }
  
  // 监听token变化，持久化到localStorage
  watch(token, (newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
      // 清除其他用户相关的本地存储
      localStorage.removeItem('userId')
      localStorage.removeItem('username')
      localStorage.removeItem('userName')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userGender')
      localStorage.removeItem('userBirthday')
      localStorage.removeItem('userBio')
      localStorage.removeItem('userAvatar')
      localStorage.removeItem('userMobile')
      localStorage.removeItem('userRole')
    }
  })
  
  // 监听用户信息变化，持久化到localStorage
  watch(() => userProfile.nickname, (newName) => {
    if (newName) {
      localStorage.setItem('userName', newName)
    }
  })
  
  watch(() => userProfile.avatar, (newAvatar) => {
    if (newAvatar) {
      localStorage.setItem('userAvatar', newAvatar)
    }
  })
  
  watch(() => userProfile.mobile, (newMobile) => {
    if (newMobile) {
      localStorage.setItem('userMobile', newMobile)
    }
  })
  
  watch(() => userProfile.userId, (newUserId) => {
    if (newUserId) {
      localStorage.setItem('userId', newUserId)
    }
  })
  
  watch(() => userProfile.username, (newUsername) => {
    if (newUsername) {
      localStorage.setItem('username', newUsername)
    }
  })
  
  watch(() => userProfile.email, (newEmail) => {
    if (newEmail) {
      localStorage.setItem('userEmail', newEmail)
    }
  })
  
  watch(() => userProfile.gender, (newGender) => {
    if (newGender !== undefined) {
      localStorage.setItem('userGender', newGender.toString())
    }
  })
  
  watch(() => userProfile.birthday, (newBirthday) => {
    if (newBirthday) {
      localStorage.setItem('userBirthday', newBirthday)
    }
  })
  
  watch(() => userProfile.bio, (newBio) => {
    if (newBio) {
      localStorage.setItem('userBio', newBio)
    }
  })
  
  watch(() => userProfile.role, (newRole) => {
    if (newRole) {
      localStorage.setItem('userRole', newRole)
    }
  })
  
  // 同步用户详细信息与用户信息
  watch(() => userProfile.nickname, (newNickname) => {
    if (newNickname) {
      userInfo.name = newNickname
    }
  })
  
  watch(() => userProfile.avatar, (newAvatar) => {
    if (newAvatar) {
      userInfo.avatar = newAvatar
    }
  })
  
  watch(() => userProfile.mobile, (newMobile) => {
    if (newMobile) {
      userInfo.mobile = newMobile
    }
  })
  
  // 更新用户头像
  const updateAvatar = (avatarUrl) => {
    console.log('UserStore: 开始更新头像URL:', avatarUrl);
    
    if (!avatarUrl) {
      console.warn('UserStore: 传入的头像URL为空，无法更新');
      return;
    }
    
    try {
      // 更新用户详细信息中的头像
      userProfile.avatar = avatarUrl;
      
      // 更新用户基本信息中的头像
      userInfo.avatar = avatarUrl;
      
      // 强制更新localStorage中的头像
      localStorage.setItem('userAvatar', avatarUrl);
      
      console.log('UserStore: 头像更新成功', {
        'userProfile.avatar': userProfile.avatar,
        'userInfo.avatar': userInfo.avatar,
        'localStorage': localStorage.getItem('userAvatar')
      });
    } catch (error) {
      console.error('UserStore: 更新头像出错:', error);
      
      // 尝试安全更新
      try {
        if (avatarUrl) {
          localStorage.setItem('userAvatar', avatarUrl);
          console.log('UserStore: 已安全地更新localStorage头像');
        }
      } catch (e) {
        console.error('UserStore: localStorage更新也失败:', e);
      }
    }
  }
  
  // 更新用户基本信息
  const updateUserInfo = (info) => {
    if (info.name || info.nickname) {
      const newName = info.name || info.nickname
      userProfile.nickname = newName
      userInfo.name = newName
    }
    if (info.avatar) {
      userProfile.avatar = info.avatar
      userInfo.avatar = info.avatar
    }
    if (info.mobile) {
      userProfile.mobile = info.mobile
      userInfo.mobile = info.mobile
    }
    if (info.email) {
      userProfile.email = info.email
    }
    if (info.gender !== undefined) {
      userProfile.gender = info.gender
    }
    if (info.birthday) {
      userProfile.birthday = info.birthday
    }
    if (info.bio) {
      userProfile.bio = info.bio
    }
    // localStorage持久化由watch监听器处理
  }
  
  // 监听地址变化，持久化到localStorage
  watch(addresses, (newAddresses) => {
    try {
      if (newAddresses) {
        const addressJson = JSON.stringify(newAddresses)
        localStorage.setItem('userAddresses', addressJson)
        console.log('地址发生变化，已更新localStorage，当前地址数量:', newAddresses.length)
      }
    } catch (error) {
      console.error('保存地址到localStorage失败:', error)
    }
  }, { deep: true })
  
  // 返回状态和方法
  return {
    // 状态
    token,
    userInfo,
    userProfile,
    addresses,
    
    // 计算属性
    isLoggedIn: () => !!token.value,
    
    // 方法
    login,
    logout,
    loadUserInfo,
    loadAddresses,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
    updateAvatar,
    updateUserInfo
  }
})
