export default {
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    automock: false,
    setupFiles: ['./setupJest.js', 'jest-localstorage-mock'],
    testEnvironment: 'jsdom',
};
