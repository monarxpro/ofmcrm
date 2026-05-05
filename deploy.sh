#!/bin/bash
cd /var/www/ofmcrm
git pull origin main
npm install --production
pm2 restart ofmcrm
echo "Deployed at $(date)"
