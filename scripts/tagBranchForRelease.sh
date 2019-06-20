#/bin/sh
set -eu 

RELEASE_BRANCH=$1
ON_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ $ON_BRANCH != $RELEASE_BRANCH ]]; then
  echo "You're on ${ON_BRANCH}.  Please checkout out $RELEASE_BRANCH before running this script"
  exit 1
fi

echo "getting latest"
git pull
PACKAGE_VERSION=$(node -p -e "require('./package.json').version")
TAG="v${PACKAGE_VERSION}"
git tag $TAG
git push origin $TAG
