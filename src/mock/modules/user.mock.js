import Mock from 'mockjs'

const Random = Mock.Random

// 生成一些常用的随机数据
Random.extend({
  // 自定义头像生成
  avatar: function() {
    // 使用本地logo作为头像
    return '/common/assets/images/logo.png'
  },
  
  // 生成一个手机号码
  mobile: function() {
    const prefixes = ['134', '135', '136', '137', '138', '139', '150', '151', '152', '157', '158', '159', '182', '183', '187', '188', '198']
    return this.pick(prefixes) + this.string('number', 8)
  },
  
  // 生成随机地址
  fullAddress: function() {
    return this.province() + this.city() + this.county() + this.cword(5, 15) + '路' + this.integer(1, 999) + '号'
  },
  
  // 生成一张base64图片验证码
  captchaImage: function() {
    // 生成随机的验证码文本 (4位数字)
    const captchaText = this.string('number', 4);
    
    // 由于在Node环境下无法使用Canvas，我们使用一种不同的方法来实现动态验证码图片
    // 我们将使用SVG格式来生成验证码图片，这样在服务端也能生成
    
    // 随机背景色和文本色
    const getRandomColor = () => {
      const r = this.integer(0, 255);
      const g = this.integer(0, 255);
      const b = this.integer(0, 255);
      return `rgb(${r},${g},${b})`;
    };
    
    // 生成干扰线
    const generateLines = (num) => {
      let lines = '';
      for (let i = 0; i < num; i++) {
        const x1 = this.integer(0, 100);
        const y1 = this.integer(0, 40);
        const x2 = this.integer(0, 100);
        const y2 = this.integer(0, 40);
        const color = getRandomColor();
        const width = this.float(0.5, 2).toFixed(1);
        lines += `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="${color}" stroke-width="${width}"/>`;
      }
      return lines;
    };
    
    // 生成干扰点
    const generateDots = (num) => {
      let dots = '';
      for (let i = 0; i < num; i++) {
        const cx = this.integer(0, 100);
        const cy = this.integer(0, 40);
        const r = this.float(0.5, 2).toFixed(1);
        const color = getRandomColor();
        dots += `<circle cx="${cx}%" cy="${cy}%" r="${r}" fill="${color}"/>`;
      }
      return dots;
    };
    
    // 生成验证码文字
    const generateText = () => {
      let texts = '';
      const charWidth = 100 / captchaText.length;
      
      for (let i = 0; i < captchaText.length; i++) {
        const x = charWidth * i + charWidth / 2;
        const y = this.integer(30, 70);
        const fontSize = this.integer(18, 24); // 数字稍微大一点，便于识别
        const color = getRandomColor();
        const rotate = this.integer(-20, 20); // 数字旋转角度稍微小一点
        texts += `<text x="${x}%" y="${y}%" font-family="Arial" font-size="${fontSize}" fill="${color}" text-anchor="middle" transform="rotate(${rotate}, ${x}, ${y})">${captchaText[i]}</text>`;
      }
      
      return texts;
    };
    
    // 生成SVG
    const bgColor = `rgb(${this.integer(240, 255)},${this.integer(240, 255)},${this.integer(240, 255)})`;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        ${generateLines(4)}
        ${generateDots(15)}
        ${generateText()}
      </svg>
    `;
    
    // 转换为Base64 - 使用环境无关的方式
    // 在浏览器和Node环境中都能工作的方式
    let svgBase64;
    try {
      // Node环境
      svgBase64 = Buffer.from(svg).toString('base64');
    } catch (e) {
      // 浏览器环境
      svgBase64 = btoa(unescape(encodeURIComponent(svg)));
    }
    
    const dataUri = `data:image/svg+xml;base64,${svgBase64}`;
    
    console.log('生成的数字验证码:', captchaText);
    
    return {
      text: captchaText,
      image: dataUri
    };
  }
})

// 返回的模拟数据
export default [
  // 验证图形验证码
  {
    url: '/mock/user/captcha/verify',
    method: 'post',
    response: ({ body }) => {
      const { captcha, captchaId } = body;
      
      // 从全局存储中获取验证码
      if (!global.captchaStore) {
        global.captchaStore = {};
      }
      
      const storedCaptcha = global.captchaStore[captchaId];
      
      console.log('验证码验证 - 输入:', captcha, '正确:', storedCaptcha);
      
      // 进行验证码比对（忽略大小写）
      if (storedCaptcha && captcha && captcha.toUpperCase() === storedCaptcha.toUpperCase()) {
        // 验证通过后删除验证码，防止重复使用
        delete global.captchaStore[captchaId];
        
        return {
          code: 200,
          data: { success: true },
          message: '验证码验证通过'
        };
      } else {
        return {
          code: 400,
          message: '验证码错误或已过期'
        };
      }
    }
  },
  
  // 用户注册接口
  {
    url: '/mock/user/register',
    method: 'post',
    response: ({ body }) => {
      const { username, mobile, password, smsCode, captcha, captchaId } = body;
      
      // 验证码验证
      if (captchaId) {
        const storedCaptcha = global.captchaStore && global.captchaStore[captchaId];
        if (!storedCaptcha || !captcha || captcha.toUpperCase() !== storedCaptcha.toUpperCase()) {
          return {
            code: 400,
            message: '验证码错误或已过期'
          };
        }
        // 验证通过后删除验证码
        delete global.captchaStore[captchaId];
      }
      
      // 验证用户名是否已存在
      if (username === 'admin') {
        return {
          code: 400,
          message: '用户名已存在'
        };
      }
      
      // 验证手机号是否已存在
      if (mobile === '13800138000') {
        return {
          code: 400,
          message: '手机号已被注册'
        };
      }
      
      // 验证短信验证码
      if (smsCode !== '123456') {
        return {
          code: 400,
          message: '短信验证码错误'
        };
      }
      
      // 初始化用户存储（如果不存在）
      if (!global.registeredUsers) {
        global.registeredUsers = [];
      }
      
      // 生成用户ID
      const userId = 'user_' + Random.string(8);
      
      // 保存注册用户信息
      const newUser = {
        userId,
        username,
        password, // 注意：实际应用中应该加密存储密码
        mobile,
        nickname: username,
        avatar: Random.avatar(),
        role: 'user',
        createTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      
      // 存储用户信息
      global.registeredUsers.push(newUser);
      
      console.log('注册新用户成功:', username, '已注册用户数:', global.registeredUsers.length);
      
      // 注册成功
      return {
        code: 200,
        data: {
          userId,
          username,
          mobile,
          createTime: newUser.createTime
        },
        message: '注册成功'
      };
    }
  },
  
  // 登录接口
  {
    url: '/mock/user/login/account',
    method: 'post',
    response: ({ body }) => {
      const { username, password, captcha, captchaId } = body;
      
      // 验证码验证
      if (captchaId) {
        const storedCaptcha = global.captchaStore && global.captchaStore[captchaId];
        if (!storedCaptcha || !captcha || captcha.toUpperCase() !== storedCaptcha.toUpperCase()) {
          return {
            code: 400,
            message: '验证码错误或已过期'
          };
        }
        // 验证通过后删除验证码
        delete global.captchaStore[captchaId];
      }
      
      // 默认管理员账号
      if (username === 'admin' && password === '123456') {
        // 生成一个随机token
        const token = Random.string(32);
        
        // 初始化token映射表
        if (!global.userTokenMap) {
          global.userTokenMap = {};
        }
        
        // 存储token与用户ID的映射关系
        global.userTokenMap[token] = '1001';
        
        return {
          code: 200,
          data: {
            token: token,
            userId: '1001',
            username: 'admin',
            nickname: '管理员',
            avatar: Random.avatar(),
            mobile: Random.mobile(),
            role: 'admin'
          },
          message: '登录成功'
        }
      }
      
      // 检查是否是注册的用户
      if (global.registeredUsers && global.registeredUsers.length > 0) {
        const user = global.registeredUsers.find(u => u.username === username && u.password === password);
        
        if (user) {
          console.log('用户登录成功:', username);
          
          // 生成一个随机token
          const token = Random.string(32);
          
          // 初始化token映射表
          if (!global.userTokenMap) {
            global.userTokenMap = {};
          }
          
          // 存储token与用户ID的映射关系
          global.userTokenMap[token] = user.userId;
          
          console.log('用户token映射:', token, '=>', user.userId);
          
          return {
            code: 200,
            data: {
              token: token,
              userId: user.userId,
              username: user.username,
              nickname: user.nickname || user.username,
              avatar: user.avatar,
              mobile: user.mobile,
              role: user.role
            },
            message: '登录成功'
          }
        }
      }
      
      // 未找到用户或密码错误
      return {
        code: 401,
        message: '用户名或密码错误'
      }
    }
  },
  
  // 短信验证码登录
  {
    url: '/mock/user/login/sms',
    method: 'post',
    response: ({ body }) => {
      const { mobile, smsCode, captcha, captchaId } = body;
      
      // 验证码验证
      if (captchaId) {
        const storedCaptcha = global.captchaStore && global.captchaStore[captchaId];
        if (!storedCaptcha || !captcha || captcha.toUpperCase() !== storedCaptcha.toUpperCase()) {
          return {
            code: 400,
            message: '验证码错误或已过期'
          };
        }
        // 验证通过后删除验证码
        delete global.captchaStore[captchaId];
      }
      
      // 默认测试账号
      if (mobile === '13800138000' && smsCode === '123456') {
        // 生成一个随机token
        const token = Random.string(32);
        
        // 初始化token映射表
        if (!global.userTokenMap) {
          global.userTokenMap = {};
        }
        
        // 存储token与用户ID的映射关系
        global.userTokenMap[token] = '1002';
        
        return {
          code: 200,
          data: {
            token: token,
            userId: '1002',
            username: 'mobile_user',
            nickname: Random.cname(),
            avatar: Random.avatar(),
            mobile: mobile,
            role: 'user'
          },
          message: '登录成功'
        }
      }
      
      // 检查是否是注册的用户
      if (global.registeredUsers && global.registeredUsers.length > 0) {
        const user = global.registeredUsers.find(u => u.mobile === mobile);
        
        if (user && smsCode === '123456') { // 为简化测试，所有验证码都接受 123456
          console.log('用户通过短信登录成功:', mobile);
          
          // 生成一个随机token
          const token = Random.string(32);
          
          // 初始化token映射表
          if (!global.userTokenMap) {
            global.userTokenMap = {};
          }
          
          // 存储token与用户ID的映射关系
          global.userTokenMap[token] = user.userId;
          
          console.log('用户token映射:', token, '=>', user.userId);
          
          return {
            code: 200,
            data: {
              token: token,
              userId: user.userId,
              username: user.username,
              nickname: user.nickname || user.username,
              avatar: user.avatar,
              mobile: user.mobile,
              role: user.role
            },
            message: '登录成功'
          }
        }
      }
      
      // 未找到用户或验证码错误
      return {
        code: 401,
        message: '手机号或验证码错误'
      }
    }
  },
  
  // 获取图形验证码
  {
    url: '/mock/user/captcha',
    method: 'get',
    timeout: 100, // 设置较短的超时时间
    statusCode: 200, // 确保状态码为200
    response: () => {
      console.log('Mock: 正在生成验证码图片')
      
      // 使用我们扩展的Random.captchaImage()生成验证码
      const captchaResult = Random.captchaImage();
      
      // 生成一个随机ID作为验证码的标识
      const captchaId = Random.string(10);
      
      // 在实际项目中，这里应该将验证码文本和ID存储在服务端缓存中，用于后续验证
      // 这里我们只做模拟，将验证码存储在Mock中的一个变量里
      // 实际项目中可以使用Redis等缓存服务来存储验证码
      if (!global.captchaStore) {
        global.captchaStore = {};
      }
      global.captchaStore[captchaId] = captchaResult.text;
      
      console.log('Mock: 验证码生成完成, ID:', captchaId, '文本:', captchaResult.text);
      
      return {
        code: 200,
        data: {
          captchaId: captchaId,
          captchaImg: captchaResult.image || captchaResult
        },
        message: '获取验证码成功'
      }
    }
  },
  
  // 获取用户个人信息
  {
    url: '/mock/user/profile',
    method: 'get',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      // 从token中提取用户标识
      // 实际项目中应该对token进行验证和解析
      // 这里为了简化，我们假设token的格式是 "Bearer {userId}"
      const tokenParts = auth.split(' ');
      const tokenValue = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
      
      // 设置一个用户映射表，用于模拟token与用户ID的关系
      // 在实际项目中，这应该通过JWT解析或查询数据库完成
      if (!global.userTokenMap) {
        global.userTokenMap = {};
      }
      
      // 查找当前登录的用户
      let currentUser = null;
      const userId = global.userTokenMap[tokenValue];
      
      // 如果是已注册用户
      if (global.registeredUsers && global.registeredUsers.length > 0) {
        for (const user of global.registeredUsers) {
          // 如果在token映射表中找到了对应的用户
          if (global.userTokenMap[tokenValue] === user.userId) {
            currentUser = user;
            break;
          }
        }
      }
      
      // 如果是管理员用户
      if (userId === '1001') {
        // 如果没有保存的管理员信息，初始化一个
        if (!global.adminUserInfo) {
          global.adminUserInfo = {
            userId: '1001',
            username: 'admin',
            nickname: '管理员',
            email: 'admin@example.com',
            gender: 0,
            birthday: '',
            bio: '',
            avatar: global.adminAvatar || Random.avatar()
          };
        }
        
        return {
          code: 200,
          data: {
            userId: '1001',
            username: 'admin',
            nickname: global.adminUserInfo.nickname,
            avatar: global.adminUserInfo.avatar || global.adminAvatar || Random.avatar(),
            mobile: global.adminUserInfo.mobile || Random.mobile(),
            email: global.adminUserInfo.email,
            gender: global.adminUserInfo.gender,
            birthday: global.adminUserInfo.birthday,
            address: global.adminUserInfo.address || Random.fullAddress(),
            bio: global.adminUserInfo.bio,
            registerTime: global.adminUserInfo.registerTime || Random.datetime('yyyy-MM-dd HH:mm:ss'),
            lastLoginTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
            role: 'admin'
          },
          message: '获取用户信息成功'
        }
      }
      
      // 如果未找到用户，则返回管理员信息
      if (!currentUser) {
        if (!global.adminUserInfo) {
          global.adminUserInfo = {
            userId: '1001',
            username: 'admin',
            nickname: '管理员',
            email: 'admin@example.com',
            gender: 0,
            birthday: '',
            bio: '',
            avatar: global.adminAvatar || Random.avatar()
          };
        }
        
        return {
          code: 200,
          data: {
            userId: '1001',
            username: 'admin',
            nickname: global.adminUserInfo.nickname,
            avatar: global.adminUserInfo.avatar || global.adminAvatar || Random.avatar(),
            mobile: global.adminUserInfo.mobile || Random.mobile(),
            email: global.adminUserInfo.email,
            gender: global.adminUserInfo.gender,
            birthday: global.adminUserInfo.birthday,
            address: global.adminUserInfo.address || Random.fullAddress(),
            bio: global.adminUserInfo.bio,
            registerTime: global.adminUserInfo.registerTime || Random.datetime('yyyy-MM-dd HH:mm:ss'),
            lastLoginTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
            role: 'admin'
          },
          message: '获取用户信息成功'
        }
      }
      
      // 返回注册用户的信息（确保有值）
      return {
        code: 200,
        data: {
          userId: currentUser.userId,
          username: currentUser.username,
          nickname: currentUser.nickname || currentUser.username,
          avatar: currentUser.avatar || '',
          mobile: currentUser.mobile || '',
          email: currentUser.email || `${currentUser.username}@example.com`,
          gender: currentUser.gender !== undefined ? currentUser.gender : 0,
          birthday: currentUser.birthday || '',
          address: currentUser.address || '',
          bio: currentUser.bio || '',
          registerTime: currentUser.createTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
          lastLoginTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
          role: currentUser.role || 'user'
        },
        message: '获取用户信息成功'
      }
    }
  },
  
  // 更新用户信息
  {
    url: '/mock/user/profile',
    method: 'put',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      // 从token中提取用户标识
      const tokenParts = auth.split(' ');
      const tokenValue = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
      
      // 获取用户ID
      if (!global.userTokenMap) {
        global.userTokenMap = {};
      }
      const userId = global.userTokenMap[tokenValue];
      
      // 获取请求中的用户数据
      const profileData = req.body;
      
      console.log('更新用户信息, 用户ID:', userId, '数据:', profileData);
      
      // 管理员用户信息存储
      if (userId === '1001') {
        // 初始化管理员用户信息对象（如果不存在）
        if (!global.adminUserInfo) {
          global.adminUserInfo = {
            userId: '1001',
            username: 'admin',
            nickname: '管理员',
            email: 'admin@example.com',
            gender: 0,
            birthday: '',
            bio: '',
            avatar: global.adminAvatar || ''
          };
        }
        
        // 更新管理员用户信息（只更新允许修改的字段）
        if (profileData.nickname) global.adminUserInfo.nickname = profileData.nickname;
        if (profileData.email) global.adminUserInfo.email = profileData.email;
        if (profileData.gender !== undefined) global.adminUserInfo.gender = profileData.gender;
        if (profileData.birthday) global.adminUserInfo.birthday = profileData.birthday;
        if (profileData.bio) global.adminUserInfo.bio = profileData.bio;
        
        console.log('已更新管理员用户信息:', global.adminUserInfo);
      }
      
      // 如果是注册用户，则更新用户信息
      if (userId && global.registeredUsers) {
        const userIndex = global.registeredUsers.findIndex(u => u.userId === userId);
        if (userIndex !== -1) {
          // 保存用户提交的信息
          const user = global.registeredUsers[userIndex];
          
          // 更新用户信息（只更新允许修改的字段）
          if (profileData.nickname) user.nickname = profileData.nickname;
          if (profileData.email) user.email = profileData.email;
          if (profileData.gender !== undefined) user.gender = profileData.gender;
          if (profileData.birthday) user.birthday = profileData.birthday;
          if (profileData.bio) user.bio = profileData.bio;
          
          console.log('已更新用户信息，用户:', user.username);
        }
      }
      
      return {
        code: 200,
        data: {
          ...profileData,
          updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        },
        message: '更新用户信息成功'
      }
    }
  },
  
  // 上传用户头像
  {
    url: '/mock/user/avatar',
    method: 'post',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      // 从token中提取用户标识
      const tokenParts = auth.split(' ');
      const tokenValue = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
      
      // 初始化token映射表（如果不存在）
      if (!global.userTokenMap) {
        global.userTokenMap = {};
      }
      
      // 获取用户ID
      const userId = global.userTokenMap[tokenValue];
      
      // 使用本地图像作为头像
      // 注意：这里返回的是相对路径，实际项目中可能需要调整
      // 在实际项目中应该处理上传的图片文件，这里仅仅是模拟
      const avatarUrl = '/common/assets/images/logo.png';
      
      console.log('用户头像上传, 用户ID:', userId, '新头像URL:', avatarUrl);
      
      // 管理员用户头像存储
      if (userId === '1001') {
        global.adminUserInfo = global.adminUserInfo || {};
        global.adminUserInfo.avatar = avatarUrl;
        global.adminAvatar = avatarUrl;
        console.log('已更新管理员头像:', avatarUrl);
      }
      
      // 如果是注册用户，则更新用户头像
      if (userId && global.registeredUsers) {
        const userIndex = global.registeredUsers.findIndex(u => u.userId === userId);
        if (userIndex !== -1) {
          // 保存新头像URL到用户记录
          global.registeredUsers[userIndex].avatar = avatarUrl;
          console.log('已更新用户头像，用户:', global.registeredUsers[userIndex].username);
        }
      }
      
      return {
        code: 200,
        data: {
          avatarUrl: avatarUrl,
          updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        },
        message: '头像上传成功'
      }
    }
  },
  
  // 获取收货地址列表
  {
    url: '/mock/user/address',
    method: 'get',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      // 生成3条收货地址
      const addresses = []
      for (let i = 0; i < 3; i++) {
        addresses.push({
          id: Random.string(8),
          name: Random.cname(),
          mobile: Random.mobile(),
          province: Random.province(),
          city: Random.city(),
          district: Random.county(),
          address: Random.cword(5, 20) + '路' + Random.integer(1, 999) + '号',
          isDefault: i === 0 // 第一个设为默认地址
        })
      }
      
      return {
        code: 200,
        data: addresses,
        message: '获取收货地址成功'
      }
    }
  },
  
  // 添加收货地址
  {
    url: '/mock/user/address',
    method: 'post',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      // 生成新的地址ID并返回完整地址对象
      return {
        code: 200,
        data: {
          ...req.body,
          id: Random.string(8),
          createTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        },
        message: '添加收货地址成功'
      }
    }
  },
  
  // 修改收货地址
  {
    url: '/mock/user/address/:id',
    method: 'put',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      return {
        code: 200,
        data: {
          ...req.body,
          updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        },
        message: '修改收货地址成功'
      }
    }
  },
  
  // 删除收货地址
  {
    url: '/mock/user/address/:id',
    method: 'delete',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      return {
        code: 200,
        data: null,
        message: '删除收货地址成功'
      }
    }
  },
  
  // 设置默认收货地址
  {
    url: '/mock/user/address/:id/default',
    method: 'put',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      return {
        code: 200,
        data: null,
        message: '设置默认地址成功'
      }
    }
  },
  
  // 修改密码
  {
    url: '/mock/user/password',
    method: 'put',
    response: (req) => {
      // 检查Authorization头
      const auth = req.headers?.authorization
      if (!auth) {
        return {
          code: 401,
          message: '未登录或登录已过期'
        }
      }
      
      const { oldPassword } = req.body
      
      // 简单验证旧密码
      if (oldPassword !== '123456') {
        return {
          code: 400,
          message: '原密码错误'
        }
      }
      
      return {
        code: 200,
        data: null,
        message: '密码修改成功'
      }
    }
  }
]
