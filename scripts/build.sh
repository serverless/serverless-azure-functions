#!/bin/bash
set -euo pipefail

npm ci
# NOTE: build will also invoke Node prebuild, pretest and test lifecycle scripts
npm run build
