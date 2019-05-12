FROM openjdk:8-jdk-slim

RUN bash -c 'addgroup -g 2000 -S builduser'
RUN bash -c 'adduser -S -G builduser -u 2001 -s /bin/bash -h /home/builduser/ builduser'

USER builduser
WORKDIR /home/builduser
