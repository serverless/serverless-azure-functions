module.exports = {
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts"
  ],
  "testEnvironment": "node",
  "transform": {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
  },
  "testPathIgnorePatterns": [
    "./lib",
    "./node_modules"
  ],
  "transformIgnorePatterns": [
    "./lib",
    "./node_modules"
  ],
  "moduleFileExtensions": [
    "js",
    "ts",
    "tsx",
    "json",
    "jsx",
    "node"
  ]
};
