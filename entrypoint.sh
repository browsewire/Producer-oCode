#!/bin/bash
sudo mkdir ~/.aws/
sudo chown 1000:1000 ~/.aws/

aws configure set aws_access_key_id $ROUTE53_KEY
aws configure set aws_secret_access_key $ROUTE53_SECRET
sudo aws configure set aws_access_key_id $ROUTE53_KEY
sudo aws configure set aws_secret_access_key $ROUTE53_SECRET

sudo cron -f &
sudo cat /hoster.sh.template | sed "s/NGINX/$NGINX/g" | sed "s/MAG_NAME/$MAG_NAME/g" | sed "s/CLUSTER_NAME/$NAMESPACE-cluster/g" | sed "s/SERVICE_NAME/$SERVICE_NAME/g" > /tmp/hoster.sh
sudo mv /tmp/hoster.sh /hoster.sh
cat /hoster.sh
echo "* * * * * sudo bash /hoster.sh" | crontab -
