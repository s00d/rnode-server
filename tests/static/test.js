// Test JavaScript File
console.log('Test JavaScript file loaded successfully!');

// Test function
function testFunction() {
    const message = 'Hello from test.js!';
    console.log(message);
    return message;
}

// Test object
const testObject = {
    name: 'Test Object',
    version: '1.0.0',
    features: ['feature1', 'feature2', 'feature3'],
    getInfo: function() {
        return `${this.name} v${this.version}`;
    }
};

// Test array
const testArray = [1, 2, 3, 4, 5];

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testFunction, testObject, testArray };
}

// Call test function
testFunction();
console.log(testObject.getInfo());
console.log('Test array:', testArray);
