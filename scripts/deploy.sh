#!/bin/bash

REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
REPO_URL=https://github.com/saandre15/$REPO_NAME

mkdir ~/.ssh/
touch ~/.ssh/private.key
echo "${{ secrets.SSH_PRODUCTION_KEY }}" >> ~./ssh/private.key
git clone REPO_URL
cd "$REPO_NAME" || exit 1
git checkout -b stable
sh ./scripts/make-env.sh

ssh -i ~/.ssh/private.key "github@${{ secrets.PRODUCTION_URL }}"
if [[ ! -d $REPO_NAME ]]
then 
  git clone "$REPO_URL"
fi
cd "$REPO_NAME" || exit 1
git checkout -b stable
exit
scp -i ~/.ssh/private-key .env "github@${{ secrets.PRODUCTION_URL }}:~/$REPO_NAME/.env"
sudo apt-get update
sudo apt-get upgrade
npm install -g pm2
npm ci
npm run test
npm run build
npm run start &
sleep 10
PROCESS_RESULT=pm2 pid petz-mania-llc-website
if [[ $PROCESS_RESULT == "" ]]; then 
  exit 1
fi
exit 0
cd ..
rm -rf ./*