FROM openjdk:8-jdk-slim

RUN bash -c 'addgroup --system --gid 2000 buildgroup'
RUN bash -c 'adduser --system --gid 2000 --uid 2001 --shell /bin/bash --home /home/builduser/ builduser'

USER builduser
WORKDIR /home/builduser
