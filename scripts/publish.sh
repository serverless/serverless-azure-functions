#!/bin/bash
set -eo pipefail

$(pwd)/scripts/build.sh

# set up .npmrc to authenticate with the provided token
echo "Set up .npmrc ..."
echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc

# NOTE: auth is taken care of via NPM_TOKEN env variable
if [ -z "$1" ]; then
  echo "Publishing 'latest' to NPM...";
  npm publish
else
  echo "Publishing 'prerelease' to NPM...";
  npm publish --tag=beta
fi
