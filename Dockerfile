FROM openjdk:8-jdk-slim

RUN bash -c 'addgroup --gid 2000 buildgroup'
RUN bash -c 'adduser --gid 2000 --uid 2001 --shell /bin/bash --home /home/builduser builduser'

RUN mkdir -p /home/builduser/
RUN chmod 777 /home/builduser/

USER builduser
WORKDIR /home/builduser
