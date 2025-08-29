# Request Object

## Properties

### Basic Properties
```javascript
req.method        // HTTP method
req.url           // Request URL
req.params        // Route parameters
req.query         // Query string parameters
req.body          // Request body
req.files         // Uploaded files
req.contentType   // Content-Type header
req.headers       // Request headers
req.cookies       // Request cookies
```

## Parameter Management

### Set Parameter
```javascript
req.setParam(name, value)
```
Set custom parameter for this request.

### Get Parameter
```javascript
req.getParam(name)
```
Get custom parameter value.

### Check Parameter
```javascript
req.hasParam(name)
```
Check if parameter exists.

### Get All Parameters
```javascript
req.getParams()
```
Get all custom parameters as object.

## Body Type Detection

### Check Body Type
```javascript
req.isFormData()      // Check if form data
req.isJsonData()      // Check if JSON data
req.isTextData()      // Check if text data
req.isBinaryData()    // Check if binary data
```

### Get Body as Specific Type
```javascript
req.getBodyAsForm()   // Get as form data (Record<string, string>)
req.getBodyAsJson()   // Get as JSON data (Record<string, any>)
req.getBodyAsText()   // Get as text data (string)
req.getBodyAsBinary() // Get as binary data (BinaryData)
```

## File Handling

### Get File
```javascript
req.getFile(fieldName)
```
Get uploaded file by field name.

### Get All Files
```javascript
req.getFiles()
```
Get all uploaded files.

### Check File
```javascript
req.hasFile(fieldName)
```
Check if file exists.

### File Count
```javascript
req.getFileCount()
```
Get number of uploaded files.

## Headers & Cookies

### Headers
```javascript
req.getHeader(name)   // Get header value
req.hasHeader(name)   // Check if header exists
req.getHeaders()      // Get all headers
```

### Cookies
```javascript
req.getCookie(name)   // Get cookie value
req.hasCookie(name)   // Check if cookie exists
req.getCookies()      // Get all cookies
```

## Example Usage

```javascript
app.post('/api/process', (req, res) => {
  // Get custom parameters
  const userId = req.getParam('userId');
  const timestamp = req.getParam('timestamp');
  
  // Process body based on type
  if (req.isFormData()) {
    const formData = req.getBodyAsForm();
    const { name, email } = formData;
    // Process form data
  } else if (req.isJsonData()) {
    const jsonData = req.getBodyAsJson();
    const { title, content } = jsonData;
    // Process JSON data
  }
  
  // Check files
  if (req.hasFile('avatar')) {
    const file = req.getFile('avatar');
    // Process uploaded file
  }
  
  // Get headers
  const userAgent = req.getHeader('user-agent');
  const auth = req.getHeader('authorization');
  
  res.json({ success: true });
});
```
