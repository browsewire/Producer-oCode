#!/bin/bash

sudo cron -f &
sudo cat /hoster.sh.template | sed "s/NGINX/$NGINX/g" | sed "s/MAG_NAME/$MAG_NAME/g" > /tmp/hoster.sh
sudo mv /tmp/hoster.sh /hoster.sh
crontab -l | grep -v "no crontab for node" | echo "*/5 * * * * sudo su -l root -c 'bash /hoster.sh'" | crontab -
