FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN apk add --no-cache python3 make g++
COPY . .
RUN mkdir -p data
EXPOSE 8080
CMD ["node", "src/server.js"]
