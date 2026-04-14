FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
COPY data/ ./data/
ENV NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]
