module.exports = {
    "testEnvironment": "node",
    "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.js?$",
    "snapshotSerializers": [
      "./scripts/function-snapshot-serializer.js"
    ]
}