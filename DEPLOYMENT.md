# BeatSmith 部署指南

## 一、服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| **CPU** | 1 核 | 2 核 |
| **内存** | 1 GB | 2 GB |
| **硬盘** | 20 GB | 50 GB |
| **系统** | Ubuntu 20.04+ | Ubuntu 22.04 |
| **Node.js** | 18+ | 20+ |

## 二、部署步骤

### 1. 购买服务器

推荐平台：
- 阿里云 ECS
- 腾讯云 CVM
- 华为云 ECS

### 2. 连接服务器

```bash
ssh root@你的服务器IP
```

### 3. 安装环境

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 Git
apt install -y git

# 安装 PM2（进程管理）
npm install -g pm2
```

### 4. 克隆代码

```bash
cd /var/www
git clone https://github.com/GuLg-721/beatsmith.git
cd beatsmith
```

### 5. 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
cd server && npm install
cd ../client && npm install
```

### 6. 配置环境变量

```bash
cd server
cat > .env << 'EOF'
PORT=3000
JWT_SECRET=你的强随机密钥
CLIENT_URL=https://你的域名.com
DB_PATH=./data.db
EOF
```

### 7. 构建前端

```bash
cd client
npm run build
```

### 8. 启动服务

```bash
cd ..

# 使用 PM2 启动
pm2 start npm --name "beatsmith" -- run start

# 或者直接启动
npm run start
```

### 9. 配置 Nginx（推荐）

```nginx
server {
    listen 80;
    server_name 你的域名.com;

    # 前端静态文件
    location / {
        root /var/www/beatsmith/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件
    location /uploads {
        proxy_pass http://localhost:3000;
    }
}
```

### 10. 配置 HTTPS（推荐）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d 你的域名.com
```

## 三、部署后设置

### 1. 创建管理员账号

```bash
# 访问网站注册账号
# 然后在数据库中将该用户设置为管理员
```

或者直接修改数据库：

```bash
cd server
node -e "
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function createAdmin() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data.db'));
  
  const hashedPassword = await bcrypt.hash('lyl04721', 10);
  db.run('INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)', 
    ['admin', hashedPassword, '管理员']);
  
  fs.writeFileSync('data.db', Buffer.from(db.export()));
  console.log('Admin created!');
}

createAdmin();
"
```

### 2. 上传歌曲

登录管理员账号，访问 `/admin/bgm` 上传背景音乐。

## 四、常用命令

```bash
# 查看日志
pm2 logs beatsmith

# 重启服务
pm2 restart beatsmith

# 停止服务
pm2 stop beatsmith

# 查看状态
pm2 status
```

## 五、域名配置

### 1. 购买域名

推荐平台：
- 阿里云万网
- 腾讯云 DNSPod
- Cloudflare

### 2. 解析域名

| 记录类型 | 主机记录 | 记录值 |
|----------|----------|--------|
| A | @ | 你的服务器IP |
| A | www | 你的服务器IP |

### 3. 修改 .env

```bash
CLIENT_URL=https://你的域名.com
```

## 六、费用估算

| 项目 | 费用 |
|------|------|
| 服务器（2核2G） | ~50-100 元/月 |
| 域名 | ~50 元/年 |
| HTTPS 证书 | 免费（Let's Encrypt） |
| **总计** | ~50-100 元/月 |

## 七、常见问题

### Q: 为什么部署后访问不了？

A: 检查：
1. 服务器防火墙是否开放 80/443 端口
2. Nginx 配置是否正确
3. PM2 进程是否运行

### Q: 为什么登录失败？

A: 检查：
1. CLIENT_URL 是否配置正确
2. JWT_SECRET 是否设置
3. 浏览器是否启用了 cookies

### Q: 为什么上传文件失败？

A: 检查：
1. uploads 目录权限
2. Nginx 配置是否转发 /uploads
3. 文件大小限制

## 八、部署检查清单

- [ ] 服务器环境安装完成
- [ ] 代码克隆完成
- [ ] 依赖安装完成
- [ ] 环境变量配置完成
- [ ] 前端构建完成
- [ ] PM2 启动成功
- [ ] Nginx 配置完成
- [ ] HTTPS 证书配置完成
- [ ] 域名解析完成
- [ ] 管理员账号创建完成
- [ ] 背景音乐上传完成
