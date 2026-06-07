FROM node:20-alpine

WORKDIR /app

# 复制 package.json
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 安装依赖
RUN cd server && npm install
RUN cd client && npm install

# 复制源代码
COPY . .

# 构建前端
RUN cd client && npm run build

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["npm", "run", "start"]
