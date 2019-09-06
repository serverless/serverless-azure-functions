#!/bin/bash

###
# This script generate a service principal using your currently set subscription
#   then write out the credentials of your new sp in a file
#   that you can export as environment variables
###
set -e

if ! [[ -x "$(command -v jq)" ]]; then
  echo "Please install [jq] before continuing -> https://stedolan.github.io/jq/download/.  Aborting."
  exit 1
fi

SP_NAME=$1

if [[ -z $SP_NAME ]]; then
  SP_NAME="FunctionsTestingPrincipal"
  echo "You didn't pass in a name for the service principal.  We'll use the default: ${SP_NAME}"
  echo
fi

SUBSCRIPTION=$(az account show | jq .name)
echo "You're using subscription: ${SUBSCRIPTION}"
echo "--> Creating service principal with name: ${SP_NAME}"
SP_RESPONSE=$(az ad sp create-for-rbac --name "http://${SP_NAME}")

FILE=".env.servicePrincipal"

echo "--> Writing creds to '${FILE}'"
cat <<EOF >${FILE}
export AZURE_SUBSCRIPTION_ID=$(az account show | jq .id)
export AZURE_TENANT_ID=$(echo "${SP_RESPONSE}" | jq .tenant)
export AZURE_CLIENT_ID=$(echo "${SP_RESPONSE}" | jq .name)
export AZURE_CLIENT_SECRET=$(echo "${SP_RESPONSE}" | jq .password)
EOF

echo "Run \"source ${FILE}\" to set your Azure account credentials "
