module.exports = {
  preset: 'ts-jest',
  transform: {
    ".(ts|tsx)": "ts-jest"
  },
  testRegex: "((\\.|/)(test|spec))\\.ts$",
  moduleFileExtensions:  ["ts", "tsx", "js"],
  testPathIgnorePatterns: [
    "/lib/",
    "/node_modules/"
  ],
  collectCoverage: true
};