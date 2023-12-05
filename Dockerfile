FROM node:14-alpine3.17

WORKDIR /

RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]