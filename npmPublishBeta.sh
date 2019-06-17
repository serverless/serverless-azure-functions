#!/bin/sh

set -e

# echo "checkout new branch for version bump"
# git checkout -b npmRelease

## configure npm to sign commit
npm config set sign-git-tag true

version=$(npm version prerelease -m "Bumped to version %s")

git tag -l

# remove git tag, we don't want to tag pr
# git tag -d ${version} 

# push to remote
git push

## only for testing
git push origin ${version}