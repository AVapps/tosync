FROM mhart/alpine-node:14
RUN adduser -D -h /home/user user
ADD alpine-build/bundle /home/user
WORKDIR /home/user
USER user
CMD node main.js
