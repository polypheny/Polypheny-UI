FROM openjdk:8-jdk-slim

RUN addgroup -g 2000 -S builduser
RUN adduser -S -G builduser -u 2001 -s /bin/bash -h /home/builduser/ builduser

USER builduser
WORKDIR /home/builduser
