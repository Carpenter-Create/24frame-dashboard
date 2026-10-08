# 24Frame Social music scan — AWS Lambda container image (x86_64).
# Build from repo root (founder / CoS; never from CI):
#   SHA=$(git rev-parse HEAD)
#   docker build --platform linux/amd64 --provenance=false \
#     --build-arg GIT_SHA=$SHA \
#     -f workers/social-music/Dockerfile -t 24frame-social-music:$SHA .
# --provenance=false keeps the manifest in a format Lambda accepts.
# See docs/infra/social-music-detect.md.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod=false
COPY tsconfig.json ./
COPY src/lib ./src/lib
COPY workers/social-music ./workers/social-music
# react-server resolves "server-only" to its no-op build outside Next.
RUN pnpm exec esbuild workers/social-music/handler.ts \
      --bundle --platform=node --format=cjs --target=node22 \
      --conditions=react-server \
      --outfile=/out/index.js

FROM public.ecr.aws/lambda/nodejs:22
COPY --from=build /out/ ${LAMBDA_TASK_ROOT}/
RUN node -e "require(process.env.LAMBDA_TASK_ROOT + '/index.js')"
ARG GIT_SHA=unknown
ENV SOCIAL_MUSIC_BUILD=$GIT_SHA
CMD ["index.handler"]
