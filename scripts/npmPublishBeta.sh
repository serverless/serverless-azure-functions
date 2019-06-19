#!/bin/sh

set -e

echo "This script will bump npm version and push changes to new branch"

# echo "checkout new branch for version bump"
git checkout -b npmRelease

## configure npm to sign commit
npm config set sign-git-tag true

version=$(npm version prerelease -m "Bumped to version %s")

git tag -l "v1*"

# remove git tag, we don't want to tag pr
git tag -d ${version} 

# push to remote
git push

## only for testing CD on test branch
## after development, we want push tag on dev/master manually
# git push origin ${version}
