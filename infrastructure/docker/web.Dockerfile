FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY apps/web apps/web
ARG API_URL=http://api:3001
ENV API_URL=$API_URL
RUN npm run build --workspace=@only1ai/web

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/.next/standalone ./
# Next traces this workspace from the monorepo root, so server.js lives under
# apps/web. Standalone output does not include public or static assets itself.
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
RUN test -f apps/web/server.js && test -f apps/web/public/brand/only1ai-logo.jpg
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
