FROM node:20-alpine

WORKDIR /app

COPY . .

EXPOSE 8899

CMD ["node", "server.js"]