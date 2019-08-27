#!/bin/bash
set -eo pipefail

./$(pwd)/scripts/build.sh

# NOTE: auth is taken care of via NPM_TOKEN env variable
if [ -z "$1" ]; then
  echo "Publishing 'latest' to NPM...";
  npm publish
else
  echo "Publishing 'prerelease' to NPM...";
  npm publish --tag=beta
fi
