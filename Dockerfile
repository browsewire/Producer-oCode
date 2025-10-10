FROM node:20

# Install AWS CLI v2
RUN curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && apt-get update && apt-get install -y unzip \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws

# Install extra tools
RUN apt-get update && apt-get install -y less sudo cron dnsutils sysstat procps net-tools curl jq bc \
    && sudo apt-get -y purge exim* \
    && rm -rf /var/lib/apt/lists/*

RUN echo "%node ALL=(ALL:ALL) NOPASSWD: ALL" >> /etc/sudoers

WORKDIR /usr/src/app

# Copy package files and install ALL deps (including dev)
COPY package*.json ./
ENV NODE_ENV=development
RUN npm install

# Copy rest of the app
COPY . .

# Copy scripts
COPY entrypoint.sh /
COPY hoster.sh.template /
RUN chmod 755 /entrypoint.sh /hoster.sh.template \
    && chown 1000:1000 /entrypoint.sh /hoster.sh.template \
    && chown node:node -R /usr/src/app/

USER node

CMD ["npm", "run", "dev"]
