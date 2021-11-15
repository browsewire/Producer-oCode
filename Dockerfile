FROM node:14

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN ./aws/install
RUN apt-get update && apt-get install -y less sudo cron dnsutils sysstat procps net-tools curl jq bc && sudo apt-get -y purge exim*
RUN echo "%node	ALL=(ALL:ALL)	NOPASSWD: ALL" >> /etc/sudoers

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
RUN mkdir -p /usr/src/app
COPY . /usr/src/app
COPY entrypoint.sh /
COPY hoster.sh.template /
RUN chmod 755 /entrypoint.sh /hoster.sh.template
RUN chown 1000:1000 /entrypoint.sh /hoster.sh.template
RUN chown node:node -R /usr/src/app/

USER node
WORKDIR /usr/src/app
RUN export PATH=$PATH:/home/node/.npm-global/bin/ && \
npm install -g nodemon && npm install 
