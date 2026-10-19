FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY apps/api apps/api
RUN npm run build --workspace=@only1ai/api

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
