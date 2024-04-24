FROM meteor/meteor-base:node14.21.4-10.2023 as build

COPY --chown=mt:mt . /tmp/src
WORKDIR /tmp/src
RUN meteor npm install
RUN meteor build --directory /tmp/build

FROM node:14

RUN useradd -ms /bin/bash meteor
RUN chmod 750 /home/meteor

COPY --from=build /tmp/build /home/meteor/server

RUN chown -R meteor:meteor /home/meteor

USER meteor

WORKDIR /home/meteor/server/bundle/programs/server
RUN npm install

WORKDIR /
CMD node /home/meteor/server/bundle/main.js
