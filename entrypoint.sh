#!/bin/bash

sudo cron -f &
sudo cat /hoster.sh.template | sed "s/NGINX/$NGINX/g" | sed "s/MAG_NAME/$MAG_NAME/g" > /tmp/hoster.sh
sudo mv /tmp/hoster.sh /hoster.sh
cat /hoster.sh
echo "* * * * * sudo su -l root -c 'bash /hoster.sh' >> /var/www/magento/var/log/varnish.log" | crontab -
