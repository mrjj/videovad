ARG BASE_CONTAINER=centos:7.8.2003
FROM ${BASE_CONTAINER}

LABEL maintainer="Ilya Kutukov <post.ilya@gmail.com>"

ENV container docker
ARG NODE_VERSION=12.13.0
ENV NODE_VERSION=${NODE_VERSION}

USER root

RUN rpm --import http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-5

# Install OS packages
RUN yum install -y \
    gcc-c++ \
    make \
    cmake \
    git \
    unzip \
  && \
  yum clean all

# Install Node.js
COPY . /home/node/

RUN ls -la /home/node/ && \
    ls -la /home/node/dockerscripts/ && \
    chmod +x /home/node/dockerscripts/*.sh && \
    /home/node/dockerscripts/setup_node_12.x.sh && \
    rm -f /home/node/dockerscripts/setup_node_12.x.sh && \
    yum install -y nodejs && \
    yum clean all

RUN rm -rf /home/node/node_modules && \
    groupadd -r node --gid=1000 && \
    useradd -r -g node --uid=1000 node && \
	  chown -R node:node /home/node/

USER node

# Install application with dependencies
RUN cd /home/node/  && \
    npm install && \
    npm run build && \
    npm cache clean --force

ENV NODE_ENV=production

WORKDIR  /home/node/

CMD ["node", "src/index.js", "$@"]
