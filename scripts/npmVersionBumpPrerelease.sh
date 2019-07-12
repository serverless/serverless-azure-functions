#!/bin/sh

set -e

echo "This script will bump npm version and push changes to new branch"

# echo "checkout new branch for version bump"
git checkout -b npmRelease

## configure npm to sign commit
npm config set sign-git-tag true

version=$(npm version prerelease -m "release: Bumped to version %s")

echo "Bumped to version ${version}"

# remove git tag, we don't want to tag pr
git tag -d ${version}

# push to remote
git push origin npmRelease

## only for testing CD on test branch
## after development, we push tag on dev/master manually
# git push origin ${version}
