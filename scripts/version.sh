#!/bin/bash
set -euo pipefail

# Environment Variables Needed:
# SOURCE_BRANCH
# GITHUB_ACCESS_TOKEN

PACKAGE_NAME=$1

LAST_COMMIT=`git log -1 --pretty=%B`

# Get NPM release type based on last commit message
# major: My commit = major release
# feat: My commit = minor release
# beta: My commit = prerelease
# anything else = patch release
if [[ ${LAST_COMMIT} == major* ]]
then
  NPM_RELEASE_TYPE="major"
elif [[ ${LAST_COMMIT} == feat* ]]
then
  NPM_RELEASE_TYPE="minor"
elif [[ ${LAST_COMMIT} == beta* ]]
then
  NPM_RELEASE_TYPE="prerelease"
else NPM_RELEASE_TYPE="patch"
fi

# Get full branch name excluding refs/head from the env var SOURCE_BRANCH
SOURCE_BRANCH_NAME=${SOURCE_BRANCH/refs\/heads\/}

# Configure git to commit as SLS Azure Functions Service Account
echo "Configuring git to use service account..."
git config --local user.name "Serverless Azure Functions"
git config --local user.email "sls-az@microsoft.com"

git pull origin ${SOURCE_BRANCH_NAME}
git checkout ${SOURCE_BRANCH_NAME}
echo "Checked out branch: ${SOURCE_BRANCH_NAME}"

NPM_VERSION=`npm version ${NPM_RELEASE_TYPE} -m "release: Update ${NPM_RELEASE_TYPE} version to %s ***NO_CI***"`
echo "Set NPM version to: ${NPM_VERSION}"

SHA=`git rev-parse HEAD`

git remote add authOrigin https://${GITHUB_ACCESS_TOKEN}@github.com/serverless/serverless-azure-functions.git
git push authOrigin ${SOURCE_BRANCH_NAME} --tags

echo "Pushed new tag: ${PACKAGE_NAME}-${NPM_VERSION} @ SHA: ${SHA:0:8}"
