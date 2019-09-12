#!/bin/bash
set -euo pipefail

# Environment Variables Needed:
# SOURCE_BRANCH
# GITHUB_ACCESS_TOKEN

PACKAGE_NAME=$1
NPM_RELEASE_TYPE=${2-"prerelease"}

# Get full branch name excluding refs/head from the env var SOURCE_BRANCH
SOURCE_BRANCH_NAME=${SOURCE_BRANCH/refs\/heads\/}

# Configure git to commit as SLS Azure Functions Service Account
echo "Configuring git to use service account..."
git config --local user.email "Serverless Azure Functions"
git config --local user.name "sls-az@microsoft.com"

git pull origin ${SOURCE_BRANCH_NAME}
git checkout ${SOURCE_BRANCH_NAME}
echo "Checked out branch: ${SOURCE_BRANCH_NAME}"

NPM_VERSION=`npm version ${NPM_RELEASE_TYPE} -m "release: Update ${NPM_RELEASE_TYPE} version to %s ***NO_CI***"`
echo "Set NPM version to: ${NPM_VERSION}"

npm run generate:changelog
git commit -a --amend --no-edit
echo "Generated changelog in CHANGELOG.md"

SHA=`git rev-parse HEAD`

git remote add authOrigin https://${GITHUB_ACCESS_TOKEN}@github.com/serverless/serverless-azure-functions.git
git push authOrigin ${SOURCE_BRANCH_NAME} --tags

echo "Pushed new tag: ${PACKAGE_NAME}-${NPM_VERSION} @ SHA: ${SHA:0:8}"
