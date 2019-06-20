#!/bin/sh

set -e

SP_NAME=${1:-"http://FunctionsTestingPrincipal"}

SUBSCRIPTION=$(az account show | jq .name)
echo "You're using subscription: ${SUBSCRIPTION}"
echo "--> Creating service principal with name: ${SP_NAME}"
SP_RESPONSE=$(az ad sp create-for-rbac --name ${SP_NAME})

FILE=".env.servicePrincipal"

echo "--> Writing creds to '${FILE}'"
cat <<EOF >${FILE}
export azureSubId=$(az account show | jq .id)
export azureServicePrincipalTenantId=$(echo "${SP_RESPONSE}" | jq .tenant)
export azureServicePrincipalClientId=$(echo "${SP_RESPONSE}" | jq .name)
export azureServicePrincipalPassword=$(echo "${SP_RESPONSE}" | jq .password)
EOF

echo "Run \"source ${FILE}\" to set your Azure account credentials "
