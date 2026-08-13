FROM node:20-alpine

WORKDIR /app

ENV PORT=8518
ENV HOST=0.0.0.0

COPY package*.json bun.lock* ./
RUN npm ci

COPY . .

EXPOSE 8518

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8518"]
