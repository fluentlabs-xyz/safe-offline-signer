#!/bin/bash
VERSION=$(date +%Y-%m-%d)-$(git rev-parse --short HEAD)

npm run build

aws s3 sync dist/ s3://main-gnosis-safe-mainnet/releases/${VERSION}/ --delete

echo "Deployed to releases/${VERSION}/"
echo "Now update CloudFront to use this path"
