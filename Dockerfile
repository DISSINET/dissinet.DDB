FROM gplane/pnpm:node22-alpine as build-env

RUN apk add tzdata openssl
ENV TZ=Europe/Prague

WORKDIR /app

ARG ENV

COPY ./packages .

RUN cd client && pnpm install && BUILD_TIMESTAMP=$(date +'%a %d.%m.%Y %H:%M') pnpm build:${ENV}
RUN rm -rf client/node_modules client/src

WORKDIR /app/server
RUN pnpm install && pnpm build
RUN pnpm prune --prod
RUN mkdir -p ./secret
RUN openssl req -x509 -newkey rsa:2048 -nodes -out ./secret/cert.pem -keyout ./secret/key.pem -days 365 -subj "/C=FR/O=krkr/OU=Domain Control Validated/CN=*"

FROM gplane/pnpm:node22-alpine 

COPY --from=build-env /app /app

WORKDIR /app/server

RUN BUILD_TIMESTAMP=$(date +'%a %d.%m.%Y %H:%M') && \
    echo "Build Timestamp during build: $BUILD_TIMESTAMP" && \
    echo "BUILD_TIMESTAMP=\"$BUILD_TIMESTAMP\"" > /app/server/.build_env 

RUN echo "source /app/server/.build_env" >> /etc/profile

CMD ["/bin/sh", "-c", "source /app/server/.build_env && pnpm start:dist -- \"$BUILD_TIMESTAMP\""]
