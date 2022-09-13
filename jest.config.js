module.exports = {
    "roots": [
      "<rootDir>/src"
    ],
    "transform": {
      "^.+\\.tsx?$": ["@swc/jest"],
    },
    "automock": false,
    "setupFiles": [
      "./setupJest.js",
      "jest-localstorage-mock"
    ],
    "testEnvironment": "jsdom"
  }
