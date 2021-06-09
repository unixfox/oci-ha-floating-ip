FROM docker-registry-proxy.herokuapp.com/mhart/alpine-node:12
WORKDIR /app
COPY package.json package-lock.json ./
COPY index.js ./
RUN npm ci --prod
FROM docker-registry-proxy.herokuapp.com/mhart/alpine-node:slim-12
RUN addgroup -g 10001 -S nonroot && adduser -u 10000 -S -G nonroot -h /app nonroot
USER nonroot
WORKDIR /app
COPY --from=0 /app .
CMD [ "node", "index.js", "--unhandled-rejections=strict" ]
