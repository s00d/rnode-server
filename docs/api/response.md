# Response Object

## HTTP Response

### Status Code
```javascript
res.status(code)
```
Set HTTP status code.

### Headers
```javascript
res.setHeader(name, value)  // Set response header
res.getHeader(name)         // Get response header
res.getHeaders()            // Get all response headers
```

## Content Types

### JSON Response
```javascript
res.json(data)
```
Send JSON response with `Content-Type: application/json`.

### HTML Response
```javascript
res.html(content)
```
Send HTML response with `Content-Type: text/html`.

### Text Response
```javascript
res.text(content)
```
Send plain text response with `Content-Type: text/plain`.

### XML Response
```javascript
res.xml(content)
```
Send XML response with `Content-Type: application/xml`.

### Generic Response
```javascript
res.send(data)
```
Send generic response with automatic content type detection.

### End Response
```javascript
res.end(data?)
```
End response with optional data.

### Set Content Type
```javascript
res.setContentType(string)
```
Set content type for `end` and `send` methods.

## File Operations

### Send File
```javascript
res.sendFile(file)
```
Send uploaded file.

### Send Multiple Files
```javascript
res.sendFiles(files)
```
Send multiple files.

### Send Buffer
```javascript
res.sendBuffer(buffer, contentType?, size?)
```
Send binary data.

### Send Multipart
```javascript
res.sendMultipart(data)
```
Send multipart data.

### Download File
```javascript
res.download(filepath, filename?)
```
Trigger file download.

### Attachment
```javascript
res.attachment(filename?)
```
Set attachment header.

## Redirects

### Redirect
```javascript
res.redirect(url, status?)
```
Redirect to URL with optional status code (default: 302).

## Cookies

### Set Cookie
```javascript
res.setCookie(name, value, options?)
```
Set response cookie with advanced options.

### Cookie Options
```javascript
res.setCookie('sessionId', 'abc123', {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  maxAge: 24 * 60 * 60, // 24 hours
  path: '/',
  domain: 'example.com'
});
```

### Get Cookie
```javascript
res.getCookie(name)
```
Get response cookie value.

### Get All Cookies
```javascript
res.getCookies()
```
Get all response cookies as object.

### Remove Cookie
```javascript
res.removeCookie(name, path?, domain?)
```
Remove cookie by setting expiration.

### Clear Cookies
```javascript
res.clearCookies()
```
Remove all cookies from response.

## Example Usage

```javascript
app.get('/api/user/{id}', (req, res) => {
  const { id } = req.params;
  
  // Set custom headers
  res.setHeader('X-User-ID', id);
  res.setHeader('Cache-Control', 'no-cache');
  
  // Set cookies
  res.setCookie('lastViewed', id, {
    httpOnly: true,
    maxAge: 3600
  });
  
  // Send response
  res.json({
    id,
    name: 'John Doe',
    email: 'john@example.com'
  });
});

app.post('/api/upload', (req, res) => {
  if (req.hasFile('document')) {
    const file = req.getFile('document');
    
    // Send file as download
    res.download(file.filepath, file.filename);
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});
```
