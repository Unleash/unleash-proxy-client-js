module.exports = {
    "roots": [
      "<rootDir>/src"
    ],
    "transform": {
      "^.+\\.tsx?$": "ts-jest"
    },
    "automock": false,
    "setupFiles": [
      "./setupJest.js"
    ],
    "testEnvironment": "jsdom"
  }