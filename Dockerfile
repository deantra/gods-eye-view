FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=development
ENV PORT=3000
ENV NODE_OPTIONS=--max-old-space-size=72
EXPOSE 3000
CMD ["node", "./node_modules/vite/bin/vite.js", "--configLoader", "native", "--host", "0.0.0.0", "--port", "3000"]
