FROM node:12-alpine
RUN addgroup -g 10001 -S nonroot && adduser -u 10000 -S -G nonroot -h /app nonroot
USER nonroot
WORKDIR /app
COPY package*.json ./
RUN npm ci --prod
COPY . .
CMD [ "npm", "start" ]