<template>
  <div class="address-selector">
    <h3 class="section-title">收货地址</h3>
    
    <el-skeleton v-if="loading" :rows="3" animated />
    
    <div v-else-if="addresses.length === 0" class="no-address">
      <el-empty description="暂无收货地址" :image-size="80">
        <template #extra>
          <el-button type="primary" size="small" @click="openAddressForm">
            添加新地址
          </el-button>
        </template>
      </el-empty>
    </div>
    
    <div v-else class="address-list">
      <div
        v-for="address in addresses"
        :key="address.id"
        class="address-item"
        :class="{ active: modelValue && modelValue.id === address.id }"
        @click="select(address)"
      >
        <div class="address-info">
          <div class="name-phone">
            <span class="name">{{ address.name }}</span>
            <span class="phone">{{ address.phone }}</span>
          </div>
          <div class="address-detail">
            <span v-if="address.isDefault" class="default-tag">默认</span>
            {{ address.province }} {{ address.city }} {{ address.district }} {{ address.address }}
          </div>
        </div>
        <div class="address-actions">
          <el-button 
            v-if="!address.isDefault"
            type="success" 
            size="small"
            link
            @click.stop="setDefaultAddress(address.id)"
          >
            设为默认
          </el-button>
          <el-button 
            type="primary" 
            size="small"
            link
            @click.stop="openAddressForm(address)"
          >
            编辑
          </el-button>
          <el-button 
            type="danger" 
            size="small" 
            link
            @click.stop="removeAddress(address.id)"
          >
            删除
          </el-button>
        </div>
      </div>
      
      <div class="add-address">
        <el-button type="primary" @click="openAddressForm">
          <el-icon><Plus /></el-icon> 添加新地址
        </el-button>
      </div>
    </div>

    <!-- 地址表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑地址' : '新增地址'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="addressForm"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="收货人" prop="name">
          <el-input v-model="addressForm.name" placeholder="请输入收货人姓名" />
        </el-form-item>
        
        <el-form-item label="手机号码" prop="phone">
          <el-input v-model="addressForm.phone" placeholder="请输入手机号码" />
        </el-form-item>
        
        <el-form-item label="所在地区" prop="region">
          <el-cascader
            v-model="addressForm.region"
            :options="regionOptions"
            placeholder="请选择所在地区"
            :props="{ 
              expandTrigger: 'hover', 
              checkStrictly: false,
              emitPath: true,
              multiple: false
            }"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="详细地址" prop="address">
          <el-input
            v-model="addressForm.address"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址信息，如街道、门牌号等"
          />
        </el-form-item>
        
        <el-form-item label="邮政编码" prop="zipCode">
          <el-input v-model="addressForm.zipCode" placeholder="请输入邮政编码" />
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="addressForm.isDefault">设为默认收货地址</el-checkbox>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAddress" :loading="submitting">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../modules/user/store/useUserStore'
import { nanoid } from 'nanoid'
// 导入Plus图标
import { Plus } from '@element-plus/icons-vue'

// 获取用户存储
const userStore = useUserStore()

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['update:modelValue'])

// 模拟地区数据
const regionOptions = ref([
  {
    value: '浙江',
    label: '浙江省',
    children: [
      {
        value: '杭州',
        label: '杭州市',
        children: [
          { value: '西湖区', label: '西湖区' },
          { value: '余杭区', label: '余杭区' },
          { value: '滨江区', label: '滨江区' },
          { value: '拱墅区', label: '拱墅区' },
          { value: '上城区', label: '上城区' },
          { value: '下城区', label: '下城区' },
          { value: '江干区', label: '江干区' }
        ]
      },
      {
        value: '宁波',
        label: '宁波市',
        children: [
          { value: '鄞州区', label: '鄞州区' },
          { value: '江北区', label: '江北区' },
          { value: '海曙区', label: '海曙区' },
          { value: '北仑区', label: '北仑区' }
        ]
      },
      {
        value: '温州',
        label: '温州市',
        children: [
          { value: '鹿城区', label: '鹿城区' },
          { value: '龙湾区', label: '龙湾区' },
          { value: '瓯海区', label: '瓯海区' }
        ]
      }
    ]
  },
  {
    value: '江苏',
    label: '江苏省',
    children: [
      {
        value: '南京',
        label: '南京市',
        children: [
          { value: '玄武区', label: '玄武区' },
          { value: '秦淮区', label: '秦淮区' },
          { value: '建邺区', label: '建邺区' },
          { value: '鼓楼区', label: '鼓楼区' },
          { value: '浦口区', label: '浦口区' },
          { value: '栖霞区', label: '栖霞区' }
        ]
      },
      {
        value: '苏州',
        label: '苏州市',
        children: [
          { value: '姑苏区', label: '姑苏区' },
          { value: '相城区', label: '相城区' },
          { value: '吴中区', label: '吴中区' },
          { value: '工业园区', label: '工业园区' },
          { value: '高新区', label: '高新区' }
        ]
      },
      {
        value: '无锡',
        label: '无锡市',
        children: [
          { value: '梁溪区', label: '梁溪区' },
          { value: '锡山区', label: '锡山区' },
          { value: '惠山区', label: '惠山区' }
        ]
      }
    ]
  },
  {
    value: '广东',
    label: '广东省',
    children: [
      {
        value: '广州',
        label: '广州市',
        children: [
          { value: '天河区', label: '天河区' },
          { value: '海珠区', label: '海珠区' },
          { value: '越秀区', label: '越秀区' },
          { value: '白云区', label: '白云区' },
          { value: '黄埔区', label: '黄埔区' },
          { value: '番禺区', label: '番禺区' }
        ]
      },
      {
        value: '深圳',
        label: '深圳市',
        children: [
          { value: '福田区', label: '福田区' },
          { value: '南山区', label: '南山区' },
          { value: '罗湖区', label: '罗湖区' },
          { value: '宝安区', label: '宝安区' },
          { value: '龙岗区', label: '龙岗区' }
        ]
      }
    ]
  }
])

// 从用户存储中获取地址
const addresses = computed(() => userStore.addresses)

// 表单状态
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const addressForm = ref({
  id: '',
  name: '',
  phone: '',
  region: [],
  address: '',
  zipCode: '',
  isDefault: false
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入收货人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  region: [{ required: true, message: '请选择所在地区', trigger: 'change' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
  zipCode: [{ pattern: /^\d{6}$/, message: '请输入正确的邮政编码', trigger: 'blur' }]
}

// 状态标志
const loading = ref(false)
const submitting = ref(false)

// 选择地址
const select = (address) => {
  emit('update:modelValue', address)
}

// 打开地址表单
const openAddressForm = (address = null) => {
  // 确保传入的地址对象是完整有效的
  const isValidAddress = address && address.name && address.phone && address.address;
  
  // 设置编辑模式标志，只有当address存在且有效时才设为true
  isEdit.value = !!isValidAddress;
  
  if (isValidAddress) {
    // 编辑现有地址
    console.log('准备编辑地址:', address.id, address.name);
    
    // 采用更灵活的匹配策略，按优先级尝试多种匹配方式
    let storeAddress = null;
    
    // 1. 首先尝试通过ID直接匹配
    if (address.id) {
      storeAddress = userStore.addresses.find(addr => addr.id === address.id);
      if (storeAddress) {
        console.log('✅ 通过ID直接匹配到地址');
      }
    }
    
    // 2. 如果ID匹配失败，尝试通过完整内容匹配（名称+电话+地址）
    if (!storeAddress) {
      storeAddress = userStore.addresses.find(addr => 
        addr.name === address.name && 
        addr.phone === address.phone &&
        addr.address === address.address
      );
      if (storeAddress) {
        console.log('✅ 通过完整内容匹配到地址');
      }
    }
    
    // 3. 如果完整内容匹配失败，仅通过名称和电话匹配
    if (!storeAddress) {
      storeAddress = userStore.addresses.find(addr => 
        addr.name === address.name && 
        addr.phone === address.phone
      );
      if (storeAddress) {
        console.log('✅ 通过名称和电话匹配到地址');
      }
    }
    
    // 4. 如果还是匹配失败，尝试更宽松的匹配（仅名称）
    if (!storeAddress && address.name) {
      const nameMatches = userStore.addresses.filter(addr => 
        addr.name === address.name
      );
      if (nameMatches.length === 1) {
        storeAddress = nameMatches[0];
      } else if (nameMatches.length > 1) {
        console.log('❓ 通过名称找到多个匹配，无法确定');
      }
    }
    
    // 创建一个备份地址对象，用于后续可能需要的合并操作
    const originalAddress = { ...address };
    
    // 如果找到匹配的地址，使用找到的地址，并合并一些来自原始地址的信息
    if (storeAddress) {
      address = {
        ...storeAddress,
        // 可能需要保留的原始数据
        region: originalAddress.region
      };
    } else {
      // 我们将使用原始地址，但不显示警告，而是将其作为信息性消息
      console.log('ℹ️ 在store中未找到匹配地址，将使用原始数据');
      
      // 确保原始地址具有有效的ID
      if (!address.id) {
        address.id = nanoid();
        console.log('为原始地址生成新ID:', address.id);
      }
    }
    
    // 处理省市区信息，根据不同格式正确提取
    let provinceName = address.province || '';
    let cityName = address.city || '';
    let districtName = address.district || '';
    
    // 去除可能的后缀
    provinceName = provinceName.replace(/省$|市$|自治区$/, '');
    cityName = cityName.replace(/市$/, '');
    districtName = districtName.replace(/区$|县$/, '');
    
    console.log('解析后的地区名称:', provinceName, cityName, districtName);
    
    const regionParts = [provinceName, cityName, districtName];

    // 确保使用地址对象中实际存在的ID
    const addressId = address.id || '';
    
    // 记录下要使用的ID，方便调试
    console.log('编辑地址使用的ID:', addressId);

    addressForm.value = {
      id: addressId,
      name: address.name || address.consignee,
      phone: address.phone || address.mobile,
      region: regionParts,
      address: address.address,
      zipCode: address.zipCode || '',
      isDefault: address.isDefault
    }
  } else {
    // 新增地址
    addressForm.value = {
      id: '',
      name: '',
      phone: '',
      region: [],
      address: '',
      zipCode: '',
      isDefault: addresses.value.length === 0 // 如果是第一个地址，默认设为默认地址
    }
  }
  
  dialogVisible.value = true
}

// 保存地址
const saveAddress = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    // 确保region有效
    if (!addressForm.value.region || addressForm.value.region.length < 3) {
      console.error('地区数据不完整:', addressForm.value.region)
      ElMessage.error('请选择完整的省市区信息')
      submitting.value = false
      return
    }
    
    // 检查省市区数据格式并规范化
    let province = '';
    let city = '';
    let district = '';
    
    // 从级联选择器数据中提取地区信息
    if (addressForm.value.region && addressForm.value.region.length >= 3) {
      // 处理值本身就包含后缀的情况
      province = addressForm.value.region[0];
      city = addressForm.value.region[1];
      district = addressForm.value.region[2];
      
      // 查找完整的标签文本
      // 查找省份标签
      const provinceOption = regionOptions.value.find(p => p.value === province);
      if (provinceOption) {
        province = provinceOption.label;
        
        // 查找城市标签
        const cityOption = provinceOption.children?.find(c => c.value === city);
        if (cityOption) {
          city = cityOption.label;
          
          // 查找区县标签
          const districtOption = cityOption.children?.find(d => d.value === district);
          if (districtOption) {
            district = districtOption.label;
          }
        }
      }
    } else {
      province = addressForm.value.region[0] || '';
      city = addressForm.value.region[1] || '';
      district = addressForm.value.region[2] || '';
    }
    
    // 确保省市区名称的格式正确
    if (!province.endsWith('省') && !province.includes('市') && !province.includes('自治区')) {
      province = province + '省';
    }
    
    if (!city.endsWith('市')) {
      city = city + '市';
    }
    
    if (!district.endsWith('区') && !district.endsWith('县')) {
      district = district + '区';
    }
    
    console.log('处理后的地区信息:', province, city, district);
    
    // 保存原始ID，用于后续跟踪
    const originalId = addressForm.value.id;
    console.log('原始ID:', originalId);
    
    // 准备地址数据
    const formattedAddress = {
      id: addressForm.value.id || nanoid(),
      name: addressForm.value.name,
      consignee: addressForm.value.name, // 兼容原有字段
      phone: addressForm.value.phone,
      mobile: addressForm.value.phone, // 兼容原有字段
      province: province,
      city: city,
      district: district,
      address: addressForm.value.address,
      zipCode: addressForm.value.zipCode || '',
      isDefault: addressForm.value.isDefault,
      // 添加时间戳和标记，帮助跟踪地址更新历史
      lastModified: new Date().toISOString(),
      isLocalAdded: true // 标记为本地添加，确保数据持久化
    }
    
    // 记录当前操作类型，便于调试
    const operationType = isEdit.value ? '编辑地址' : '新增地址';
    console.log(`开始${operationType}:`, formattedAddress);
    
    try {
      if (isEdit.value) {
        // 检查ID是否存在于地址列表中
        let targetId = formattedAddress.id;
        const existingAddressIndex = userStore.addresses.findIndex(addr => addr.id === targetId);
        console.log('更新地址，ID:', targetId, '在地址列表中的索引:', existingAddressIndex);
        
        // 如果在地址列表中找不到ID
        if (existingAddressIndex === -1) {
          console.log('提示: 要更新的地址ID不在当前列表中(ID:', targetId, ')');
          
          // 创建当前地址列表的深拷贝，准备更新
          const newAddresses = JSON.parse(JSON.stringify(userStore.addresses));
          
          try {
            // 尝试更新，有可能成功（如果userStore能正确处理）
            await userStore.updateAddress(targetId, formattedAddress);
            console.log('✅ 地址更新成功，尽管ID在本地列表中不存在');
            
            // 确保更新后的地址在地址列表中
            if (!userStore.addresses.some(addr => addr.id === targetId)) {
              console.log('🔄 更新后的地址不在列表中，将其添加到列表');
              // 使用unshift而不是push，确保新地址显示在列表顶部
              userStore.addresses = [{ ...formattedAddress, id: targetId }, ...userStore.addresses];
            }
          } catch (updateError) {
            
            // 切换到添加模式
            isEdit.value = false;
            
            // 如果保留原ID失败，生成新的ID并添加
            if (!originalId || updateError.message.includes('未找到')) {
              const newId = nanoid();
              formattedAddress.id = newId;
            }
            
            // 添加地址，并捕获可能的错误
            try {
              await userStore.addAddress(formattedAddress);
            } catch (addError) {
              console.error('❌ 降级添加也失败:', addError);
              // 直接添加到本地数组
              userStore.addresses = [formattedAddress, ...userStore.addresses];
            }
          }
        } else {
          // 更新现有地址
          console.log('更新地址，最终使用ID:', targetId);
          
          try {
            await userStore.updateAddress(targetId, formattedAddress);
            console.log('地址更新成功');
          } catch (updateError) {
            console.error('更新地址失败:', updateError);
            // 本地更新作为备选
            const updatedAddresses = userStore.addresses.map(addr => {
              if (addr.id === targetId) {
                return { ...formattedAddress, id: targetId };
              }
              return addr;
            });
            userStore.addresses = updatedAddresses;
          } finally {
            // 无论成功失败，都强制触发地址列表的完整更新
            userStore.addresses = [...userStore.addresses];
          }
        }
      } else {
        // 添加新地址
        console.log('添加新地址:', formattedAddress);
        try {
          await userStore.addAddress(formattedAddress);
        } catch (addError) {
          // 直接添加到本地数组
          userStore.addresses = [formattedAddress, ...userStore.addresses];
        }
        
        // 强制触发地址列表的完整更新
        userStore.addresses = [...userStore.addresses];
      }
      
      // 如果是默认地址或者当前没有选择的地址，则自动选择这个地址
      if (formattedAddress.isDefault || !props.modelValue) {
        // 获取更新后的地址
        let updatedAddress = null;
        
        // 尝试从地址列表中找到对应的地址
        updatedAddress = userStore.addresses.find(addr => addr.id === formattedAddress.id);
        
        // 如果找不到，则直接使用格式化后的地址
        if (!updatedAddress) {
          console.warn('在地址列表中找不到更新后的地址，使用本地格式化的地址');
          updatedAddress = formattedAddress;
          
          // 确保这个地址也被添加到地址列表中
          if (!userStore.addresses.some(addr => addr.id === formattedAddress.id)) {
            console.log('将格式化的地址添加到地址列表');
            userStore.addresses = [formattedAddress, ...userStore.addresses];
          }
        }
        
        console.log('选择更新后的地址:', updatedAddress);
        select(updatedAddress);
      }
      
      // 更新成功提示
      ElMessage.success(isEdit.value ? '地址已更新' : '新地址已添加');
      
      // 关闭对话框
      dialogVisible.value = false;
      
      // 确保地址列表是最新的 - 直接给整个数组赋值，确保触发Vue的响应式更新
      if (userStore.addresses.length > 0) {
        console.log('更新后的地址列表:', userStore.addresses);
        
        // 手动确保数据已保存到localStorage，防止刷新丢失
        forceSaveAddressesToLocalStorage();
        
        // 额外的保证 - 强制触发地址列表的完整更新
        userStore.addresses = [...userStore.addresses];
        
        // 延迟再次保存，确保所有异步操作都已完成
        setTimeout(() => {
          forceSaveAddressesToLocalStorage();
        }, 500);
      }
    } catch (error) {
      console.error(isEdit.value ? '更新地址失败:' : '添加地址失败:', error)
      console.error('详细错误信息:', error.message, error.stack)
      console.error('当前地址ID:', formattedAddress.id)
      console.error('当前编辑状态:', isEdit.value)
      console.error('地址数据:', formattedAddress)
      console.error('当前地址列表:', userStore.addresses)
      ElMessage.error(`${isEdit.value ? '更新' : '添加'}地址失败: ${error.message || '未知错误'}`)
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

// 添加一个强制保存到localStorage的函数，避免重复代码
const forceSaveAddressesToLocalStorage = () => {
  try {
    if (userStore.addresses && userStore.addresses.length >= 0) {
      // 深拷贝确保完整保存
      const addressesToSave = JSON.parse(JSON.stringify(userStore.addresses));
      localStorage.setItem('userAddresses', JSON.stringify(addressesToSave));
      
      // 验证保存是否成功
      const savedData = localStorage.getItem('userAddresses');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
        } catch (e) {
          console.error('❌ 验证localStorage数据失败:', e);
        }
      }
    }
  } catch (error) {
    console.error('❌ 保存地址到localStorage失败:', error);
  }
};

// 删除地址
const removeAddress = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个地址吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    try {
      // 删除地址 - 使用正确的方法名
      await userStore.removeAddress(id)
      
      // 如果删除的是当前选中的地址，则需要重新选择
      if (props.modelValue && props.modelValue.id === id) {
        // 优先选择默认地址，如果没有默认地址则选择第一个地址
        const defaultAddress = userStore.addresses.find(item => item.isDefault)
        if (defaultAddress) {
          select(defaultAddress)
        } else if (userStore.addresses.length > 0) {
          select(userStore.addresses[0])
        } else {
          select(null)
        }
      }
      
      // 立即保存到localStorage确保数据一致性
      forceSaveAddressesToLocalStorage();
      
      // 额外的保证 - 强制触发地址列表的完整更新
      userStore.addresses = [...userStore.addresses];
      
      ElMessage.success('地址已删除')
    } catch (error) {
      console.error('删除地址失败:', error);
      
      // 尝试本地删除作为备选方案
      try {
        console.log('尝试本地删除地址:', id);
        const index = userStore.addresses.findIndex(addr => addr.id === id);
        if (index !== -1) {
          const newAddresses = [...userStore.addresses];
          newAddresses.splice(index, 1);
          userStore.addresses = newAddresses;
          
          // 立即保存到localStorage
          forceSaveAddressesToLocalStorage();
          
          ElMessage.success('地址已删除');
        } else {
          throw new Error('未找到要删除的地址');
        }
      } catch (localError) {
        ElMessage.error(`删除地址失败: ${error.message || '未知错误'}`);
      }
    }
  } catch {
    // 用户取消操作
  }
}

// 设置默认地址
const setDefaultAddress = async (id) => {
  try {
    await ElMessageBox.confirm('确定要将这个地址设为默认地址吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    try {
      // 设置默认地址
      await userStore.setDefaultAddress(id)
      
      // 如果设置的是当前选中的地址，则需要重新选择
      if (props.modelValue && props.modelValue.id === id) {
        // 获取当前已设为默认的地址
        const defaultAddress = userStore.addresses.find(item => item.isDefault)
        if (defaultAddress) {
          select(defaultAddress)
        } else if (userStore.addresses.length > 0) {
          select(userStore.addresses[0])
        } else {
          select(null)
        }
      }
      
      // 立即保存到localStorage确保数据一致性
      forceSaveAddressesToLocalStorage();
      
      // 强制触发地址列表的完整更新
      userStore.addresses = [...userStore.addresses];
      
      ElMessage.success('默认地址已设置')
    } catch (error) {
      console.error('设置默认地址失败:', error);
      
      // 尝试本地设置默认地址作为备选方案
      try {
        console.log('尝试本地设置默认地址:', id);
        const newAddresses = userStore.addresses.map(addr => ({
          ...addr,
          isDefault: addr.id === id
        }));
        
        userStore.addresses = newAddresses;
        
        // 立即保存到localStorage
        forceSaveAddressesToLocalStorage();
        
        ElMessage.success('默认地址已设置');
      } catch (localError) {
        ElMessage.error(`设置默认地址失败: ${error.message || '未知错误'}`);
      }
    }
  } catch {
    // 用户取消操作
  }
}

// 初始化时，如果有默认地址且未选择地址，则自动选择默认地址
onMounted(() => {

  
  // 首先强制检查localStorage中的地址数据
  const localAddresses = localStorage.getItem('userAddresses');
  if (localAddresses) {
    try {
      const parsedAddresses = JSON.parse(localAddresses);
      if (Array.isArray(parsedAddresses) && parsedAddresses.length > 0) {
        
        // 如果地址store中没有地址，但localStorage有，则直接使用localStorage中的地址
        if (userStore.addresses.length === 0) {
          // 使用直接赋值而不是修改原数组，确保触发Vue的响应式更新
          userStore.addresses = parsedAddresses;
        } else if (userStore.addresses.length !== parsedAddresses.length) {
         
          
          // 尝试比较和同步 - 使用深拷贝确保引用变化
          const storeIds = userStore.addresses.map(addr => addr.id);
          const localIds = parsedAddresses.map(addr => addr.id);
          
          // 合并地址 - 首先保留localStorage中的所有地址
          let mergedAddresses = [...parsedAddresses];
          
          // 再添加store中有但localStorage中没有的地址
          userStore.addresses.forEach(storeAddr => {
            if (!localIds.includes(storeAddr.id)) {
              mergedAddresses.push({...storeAddr, isLocalAdded: true});
            }
          });
          
          // 确保合并后的地址中只有一个默认地址
          let hasDefault = false;
          mergedAddresses = mergedAddresses.map(addr => {
            if (addr.isDefault) {
              if (hasDefault) {
                return {...addr, isDefault: false};
              }
              hasDefault = true;
            }
            return addr;
          });
          
          // 替换整个数组，确保触发Vue的响应式更新
          userStore.addresses = mergedAddresses;
          
          // 立即更新回localStorage
          forceSaveAddressesToLocalStorage();
        }
      }
    } catch (e) {
      console.error('❌ 解析localStorage中的地址数据失败:', e);
    }
  } else {
    console.log('📭 localStorage中没有地址数据');
  }

  // 自动选择默认地址（如果有的话）
  if (!props.modelValue && userStore.addresses.length > 0) {
    const defaultAddress = userStore.addresses.find(item => item.isDefault);
    if (defaultAddress) {
      select(defaultAddress);
    } else {
      select(userStore.addresses[0]);
    }
  }
  
  // 加载用户地址（如果已登录且没有地址）
  if (userStore.isLoggedIn() && userStore.addresses.length === 0) {
    loading.value = true;
    
    userStore.loadAddresses().then(addresses => {
      
      // 如果有地址，选择默认地址或第一个
      if (addresses.length > 0 && !props.modelValue) {
        const defaultAddress = addresses.find(item => item.isDefault);
        if (defaultAddress) {
          select(defaultAddress);
        } else {
          select(addresses[0]);
        }
      }
    }).catch(error => {
      console.error('❌ 加载地址失败:', error);
    }).finally(() => {
      loading.value = false;
      
      // 确保地址数据保存到localStorage
      if (userStore.addresses.length > 0) {
        forceSaveAddressesToLocalStorage();
      }
    });
  } else if (userStore.addresses.length > 0) {
    // 即使有地址，也确保保存一次到localStorage
    forceSaveAddressesToLocalStorage();
  }
  
  // 页面加载完成后再次确认地址数据已保存
  setTimeout(() => {
    if (userStore.addresses.length > 0) {
      forceSaveAddressesToLocalStorage();
    }
  }, 1000);
  
  // 额外保障 - 每隔一段时间自动同步到localStorage
  const autoSaveInterval = setInterval(() => {
    if (userStore.addresses.length > 0) {
      forceSaveAddressesToLocalStorage();
    }
  }, 10000); // 每10秒同步一次
  
  // 组件销毁时清除定时器
  onBeforeUnmount(() => {
    clearInterval(autoSaveInterval);
  });
})

// 监听地址变化，强制同步到localStorage
watch(() => userStore.addresses, (newAddresses) => {
  // 如果当前选中的地址不在新地址列表中，重新选择
  if (props.modelValue && !newAddresses.some(addr => addr.id === props.modelValue.id)) {
    const defaultAddress = newAddresses.find(item => item.isDefault)
    if (defaultAddress) {
      select(defaultAddress)
    } else if (newAddresses.length > 0) {
      select(newAddresses[0])
    } else {
      select(null)
    }
  }
  
  // 强制同步地址列表到localStorage
  if (newAddresses && newAddresses.length >= 0) {
    console.log('🔄 地址数据变更，正在同步到localStorage，数量:', newAddresses.length);
    forceSaveAddressesToLocalStorage();
  }
}, { deep: true })

// 确保组件在销毁前将数据保存到localStorage
onBeforeUnmount(() => {
  if (userStore.addresses.length > 0) {
    forceSaveAddressesToLocalStorage();
  }
});
</script>

<style lang="scss" scoped>
@use "../../modules/order/style/checkout.scss" as *;

// 以下是组件特定样式，保留与公共样式不冲突的部分
.address-selector {
  margin-bottom: 20px;
  
  .section-title {
    margin: 0 0 15px;
    font-size: 18px;
    font-weight: 500;
    color: #333;
  }
  
  .no-address {
    background-color: #f8f8f8;
    padding: 30px;
    border-radius: 6px;
  }
  
  .address-list {
    .address-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      margin-bottom: 10px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      
      &:hover {
        background-color: #f8f8f8;
      }
      
      &.active {
        border-color: #ff5000;
        background-color: #fff1e9;
      }
      
      .address-info {
        flex: 1;
        
        .name-phone {
          margin-bottom: 8px;
          
          .name {
            font-weight: 500;
            margin-right: 15px;
          }
          
          .phone {
            color: #666;
          }
        }
        
        .address-detail {
          color: #666;
          
          .default-tag {
            display: inline-block;
            font-size: 12px;
            padding: 0 5px;
            margin-right: 5px;
            background-color: #ff5000;
            color: #fff;
            border-radius: 2px;
          }
        }
      }
      
      .address-actions {
        display: flex;
        gap: 10px;
      }
    }
    
    .add-address {
      margin-top: 20px;
      text-align: center;
    }
  }
}
</style> 