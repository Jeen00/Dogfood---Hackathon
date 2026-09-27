FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p data
EXPOSE 8080
CMD ["node", "src/server.js"]
