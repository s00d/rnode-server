# Advanced Body Type Handling

## Overview

RNode Server provides comprehensive body type detection and handling capabilities for different content types.

## Body Type Detection

### Type Checking Methods
```typescript
// Check body content type
req.isFormData()      // Returns true if form data
req.isJsonData()      // Returns true if JSON data
req.isTextData()      // Returns true if plain text
req.isBinaryData()    // Returns true if binary data
```

### Type-Specific Extraction
```typescript
// Get body as specific type
req.getBodyAsForm()   // Returns Record<string, string>
req.getBodyAsJson()   // Returns Record<string, any>
req.getBodyAsText()   // Returns string
req.getBodyAsBinary() // Returns BinaryData
```

## Complete Request Processing Example

### Request Information Logging
```typescript
app.post('/api/process-data', (req, res) => {
  console.log('=== Request Information ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Content-Type:', req.contentType);
  console.log('IP:', req.ip);
  console.log('IP Source:', req.ipSource);
  
  // === PATH PARAMETERS ===
  console.log('Path Parameters:', req.params);
  if (req.params.userId) {
    console.log('User ID from path:', req.params.userId);
  }
  
  // === QUERY PARAMETERS ===
  console.log('Query Parameters:', req.query);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  console.log('Page:', page, 'Limit:', limit);
  
  // === HEADERS ===
  console.log('Headers:', req.headers);
  const userAgent = req.getHeader('user-agent');
  const authorization = req.getHeader('authorization');
  console.log('User-Agent:', userAgent);
  console.log('Authorization:', authorization);
  
  // === COOKIES ===
  console.log('Cookies:', req.cookies);
  const sessionId = req.getCookie('sessionId');
  const theme = req.getCookie('theme');
  console.log('Session ID:', sessionId);
  console.log('Theme:', theme);
  
  // === BODY PROCESSING ===
  console.log('=== Body Processing ===');
  
  if (req.isFormData()) {
    const formData = req.getBodyAsForm();
    if (formData) {
      console.log('✅ Form Data Detected');
      const name = formData.name || '';
      const email = formData.email || '';
      const age = parseInt(formData.age) || 0;
      
      console.log('Form Fields:', { name, email, age });
      
      res.json({ 
        type: 'form', 
        data: { name, email, age },
        message: 'Form data processed successfully'
      });
    } else {
      res.status(400).json({ error: 'Form data parsing failed' });
    }
    
  } else if (req.isJsonData()) {
    const jsonData = req.getBodyAsJson();
    if (jsonData) {
      console.log('✅ JSON Data Detected');
      const { title, content, tags = [], metadata = {} } = jsonData;
      
      console.log('JSON Fields:', { title, content, tags, metadata });
      
      res.json({ 
        type: 'json', 
        data: { title, content, tags, metadata },
        message: 'JSON data processed successfully'
      });
    } else {
      res.status(400).json({ error: 'JSON parsing failed' });
    }
    
  } else if (req.isTextData()) {
    const textData = req.getBodyAsText();
    if (textData) {
      console.log('✅ Text Data Detected');
      console.log('Text Content:', textData);
      
      res.json({ 
        type: 'text', 
        data: textData,
        length: textData.length,
        message: 'Text data processed successfully'
      });
    } else {
      res.status(400).json({ error: 'Text data parsing failed' });
    }
    
  } else if (req.isBinaryData()) {
    const binaryData = req.getBodyAsBinary();
    if (binaryData) {
      console.log('✅ Binary Data Detected');
      console.log('Binary Info:', {
        type: binaryData.contentType,
        size: binaryData.size,
        dataLength: binaryData.data.length
      });
      
      res.json({ 
        type: 'binary', 
        data: {
          contentType: binaryData.contentType,
          size: binaryData.size,
          dataLength: binaryData.data.length
        },
        message: 'Binary data processed successfully'
      });
    } else {
      res.status(400).json({ error: 'Binary data parsing failed' });
    }
    
  } else {
    console.log('❌ Unknown body type');
    res.status(400).json({ 
      error: 'Unsupported content type',
      contentType: req.contentType
    });
  }
});
```

## Form Data Processing

### Basic Form Handling
```typescript
app.post('/api/contact', (req, res) => {
  if (!req.isFormData()) {
    return res.status(400).json({ error: 'Form data required' });
  }
  
  const formData = req.getBodyAsForm();
  if (!formData) {
    return res.status(400).json({ error: 'Form data parsing failed' });
  }
  
  const { name, email, message, subject } = formData;
  
  // Validation
  const errors = [];
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!email || !email.includes('@')) {
    errors.push('Valid email required');
  }
  
  if (!message || message.trim().length < 10) {
    errors.push('Message must be at least 10 characters');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }
  
  // Process form data
  const contactData = {
    name: name.trim(),
    email: email.trim(),
    subject: subject || 'Contact Form',
    message: message.trim(),
    submittedAt: new Date().toISOString()
  };
  
  // Save to database or send email
  saveContactForm(contactData);
  
  res.json({
    success: true,
    message: 'Contact form submitted successfully',
    data: contactData
  });
});
```

### Advanced Form Processing
```typescript
app.post('/api/survey', (req, res) => {
  if (!req.isFormData()) {
    return res.status(400).json({ error: 'Form data required' });
  }
  
  const formData = req.getBodyAsForm();
  if (!formData) {
    return res.status(400).json({ error: 'Form data parsing failed' });
  }
  
  // Process different field types
  const surveyData = {
    // Basic fields
    name: formData.name || '',
    email: formData.email || '',
    age: parseInt(formData.age) || 0,
    
    // Checkbox fields (multiple values)
    interests: formData.interests ? 
      (Array.isArray(formData.interests) ? formData.interests : [formData.interests]) : [],
    
    // Radio button
    gender: formData.gender || '',
    
    // Select field
    country: formData.country || '',
    
    // Textarea
    feedback: formData.feedback || '',
    
    // Hidden fields
    source: formData.source || 'web',
    timestamp: formData.timestamp || new Date().toISOString()
  };
  
  // Validate required fields
  const requiredFields = ['name', 'email'];
  const missingFields = requiredFields.filter(field => !surveyData[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      missing: missingFields
    });
  }
  
  // Process interests array
  if (surveyData.interests.length === 0) {
    surveyData.interests = ['none'];
  }
  
  // Save survey data
  saveSurveyData(surveyData);
  
  res.json({
    success: true,
    message: 'Survey submitted successfully',
    data: surveyData
  });
});
```

## JSON Data Processing

### Basic JSON Handling
```typescript
app.post('/api/users', (req, res) => {
  if (!req.isJsonData()) {
    return res.status(400).json({ error: 'JSON data required' });
  }
  
  const userData = req.getBodyAsJson();
  if (!userData) {
    return res.status(400).json({ error: 'JSON parsing failed' });
  }
  
  const { name, email, age, profile } = userData;
  
  // Validate user data
  const validation = validateUserData(userData);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors
    });
  }
  
  // Create user object
  const user = {
    id: generateUserId(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    age: age || null,
    profile: profile || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Save to database
  const savedUser = saveUser(user);
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: savedUser
  });
});
```

### Complex JSON Processing
```typescript
app.post('/api/orders', (req, res) => {
  if (!req.isJsonData()) {
    return res.status(400).json({ error: 'JSON data required' });
  }
  
  const orderData = req.getBodyAsJson();
  if (!orderData) {
    return res.status(400).json({ error: 'JSON parsing failed' });
  }
  
  const { 
    customer, 
    items, 
    shipping, 
    payment, 
    metadata 
  } = orderData;
  
  // Validate customer
  if (!customer || !customer.email || !customer.name) {
    return res.status(400).json({
      success: false,
      error: 'Customer information required'
    });
  }
  
  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Order must contain at least one item'
    });
  }
  
  // Validate each item
  const validItems = items.filter(item => 
    item.productId && item.quantity && item.quantity > 0
  );
  
  if (validItems.length !== items.length) {
    return res.status(400).json({
      success: false,
      error: 'Invalid items in order',
      invalidItems: items.length - validItems.length
    });
  }
  
  // Calculate totals
  const subtotal = validItems.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  );
  
  const tax = subtotal * 0.1; // 10% tax
  const shippingCost = shipping?.cost || 0;
  const total = subtotal + tax + shippingCost;
  
  // Create order
  const order = {
    id: generateOrderId(),
    customer: {
      name: customer.name.trim(),
      email: customer.email.toLowerCase().trim(),
      phone: customer.phone || null
    },
    items: validItems.map(item => ({
      productId: item.productId,
      name: item.name || 'Unknown Product',
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    })),
    totals: {
      subtotal,
      tax,
      shipping: shippingCost,
      total
    },
    shipping: shipping || {},
    payment: payment || {},
    metadata: metadata || {},
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  // Save order
  const savedOrder = saveOrder(order);
  
  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    order: savedOrder
  });
});
```

## Text Data Processing

### Plain Text Handling
```typescript
app.post('/api/notes', (req, res) => {
  if (!req.isTextData()) {
    return res.status(400).json({ error: 'Text data required' });
  }
  
  const textData = req.getBodyAsText();
  if (!textData) {
    return res.status(400).json({ error: 'Text data parsing failed' });
  }
  
  // Process text content
  const note = {
    id: generateNoteId(),
    content: textData.trim(),
    length: textData.length,
    wordCount: textData.split(/\s+/).filter(word => word.length > 0).length,
    createdAt: new Date().toISOString()
  };
  
  // Save note
  saveNote(note);
  
  res.json({
    success: true,
    message: 'Note saved successfully',
    note
  });
});
```

### Markdown Processing
```typescript
app.post('/api/markdown', (req, res) => {
  if (!req.isTextData()) {
    return res.status(400).json({ error: 'Text data required' });
  }
  
  const markdownText = req.getBodyAsText();
  if (!markdownText) {
    return res.status(400).json({ error: 'Markdown text parsing failed' });
  }
  
  // Process markdown
  const processed = {
    original: markdownText,
    html: markdownToHtml(markdownText),
    stats: {
      characters: markdownText.length,
      words: markdownText.split(/\s+/).filter(word => word.length > 0).length,
      lines: markdownText.split('\n').length,
      headings: (markdownText.match(/^#{1,6}\s+/gm) || []).length,
      links: (markdownText.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
      images: (markdownText.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length
    }
  };
  
  res.json({
    success: true,
    message: 'Markdown processed successfully',
    data: processed
  });
});
```

## Binary Data Processing

### File Upload Processing
```typescript
app.post('/api/upload-binary', (req, res) => {
  if (!req.isBinaryData()) {
    return res.status(400).json({ error: 'Binary data required' });
  }
  
  const binaryData = req.getBodyAsBinary();
  if (!binaryData) {
    return res.status(400).json({ error: 'Binary data parsing failed' });
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(binaryData.contentType)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported file type',
      allowedTypes,
      receivedType: binaryData.contentType
    });
  }
  
  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (binaryData.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: 'File too large',
      maxSize,
      receivedSize: binaryData.size
    });
  }
  
  // Generate filename
  const extension = binaryData.contentType.split('/')[1];
  const filename = `upload_${Date.now()}.${extension}`;
  
  // Save file
  const filePath = `./uploads/${filename}`;
  const success = saveBinaryFile(binaryData.data, filePath);
  
  if (success) {
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        filename,
        path: filePath,
        size: binaryData.size,
        type: binaryData.contentType,
        uploadedAt: new Date().toISOString()
      }
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to save file'
    });
  }
});
```

## Error Handling

### Validation Errors
```typescript
function validateUserData(data: any) {
  const errors = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name must be a string with at least 2 characters');
  }
  
  if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
    errors.push('Valid email address required');
  }
  
  if (data.age && (typeof data.age !== 'number' || data.age < 0 || data.age > 150)) {
    errors.push('Age must be a number between 0 and 150');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Parsing Errors
```typescript
app.post('/api/data', (req, res) => {
  try {
    let data;
    
    if (req.isJsonData()) {
      data = req.getBodyAsJson();
      if (!data) {
        throw new Error('JSON parsing failed');
      }
    } else if (req.isFormData()) {
      data = req.getBodyAsForm();
      if (!data) {
        throw new Error('Form data parsing failed');
      }
    } else if (req.isTextData()) {
      data = req.getBodyAsText();
      if (!data) {
        throw new Error('Text data parsing failed');
      }
    } else {
      throw new Error('Unsupported content type');
    }
    
    // Process data
    const result = processData(data);
    
    res.json({
      success: true,
      result
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      contentType: req.contentType
    });
  }
});
```

## Best Practices

### Content Type Validation
Always check content type before processing body data.

### Error Handling
Provide clear error messages for different failure scenarios.

### Data Validation
Validate data structure and content before processing.

### Security
Sanitize and validate all input data to prevent injection attacks.

### Performance
Process large data streams efficiently to avoid memory issues.

## Next Steps

- [Request Object](../api/request.md) - Complete request API
- [File Operations](./file-operations.md) - File handling examples
- [Advanced Usage](./advanced-usage.md) - Advanced patterns
- [API Reference](../api/) - Complete API documentation
