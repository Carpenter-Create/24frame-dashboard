# 24Frame Social topic tagging — AWS Lambda container image (x86_64).
# Build from repo root (founder / CoS; never from CI):
#   docker build --platform linux/amd64 --provenance=false \
#     -f workers/social-topic/Dockerfile -t 24frame-social-topic .
# --provenance=false keeps the manifest in a format Lambda accepts.
# See docs/infra/social-topic-tagging.md for the ECR push and Lambda update.

# Build: install from the lockfile, then bundle the handler. sharp stays out
# of the bundle (native), so its Linux build is copied in below.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod=false
COPY tsconfig.json ./
COPY src/lib ./src/lib
COPY workers/social-topic ./workers/social-topic
# react-server resolves "server-only" to its no-op build outside Next.
RUN pnpm exec esbuild workers/social-topic/handler.ts \
      --bundle --platform=node --format=cjs --target=node22 \
      --conditions=react-server --external:sharp \
      --outfile=/out/index.js
# sharp and its runtime packages, dereferenced out of pnpm's store layout.
RUN mkdir -p /out/node_modules/@img \
 && SHARP="$(ls -d node_modules/.pnpm/sharp@*/node_modules | head -n 1)" \
 && cp -RL "$SHARP/sharp" "$SHARP/detect-libc" "$SHARP/semver" /out/node_modules/ \
 && cp -RL "$SHARP"/@img/* /out/node_modules/@img/

FROM public.ecr.aws/lambda/nodejs:22
COPY --from=build /out/ ${LAMBDA_TASK_ROOT}/
# Fail the build, not the first invocation, if sharp cannot load.
RUN node -e "require(process.env.LAMBDA_TASK_ROOT + '/node_modules/sharp')"
CMD ["index.handler"]
