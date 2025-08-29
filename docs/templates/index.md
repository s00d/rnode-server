# Template Engine

## Overview

RNode Server includes the Tera template engine for server-side HTML rendering. Tera is a fast, secure, and feature-rich template engine written in Rust.

## Key Components

- **[Overview](./index.md)** - Template engine introduction
- **[Syntax](./syntax.md)** - Template syntax and features
- **[Examples](./examples.md)** - Practical template examples

## Quick Start

### Initialize Templates
```javascript
import { createApp } from 'rnode-server';

const app = createApp();

// Initialize Tera templates
app.initTemplates('./templates/**/*.html', { autoescape: true });
```

### Render Template
```javascript
app.get('/welcome', (req, res) => {
  const result = app.renderTemplate('welcome.html', {
    title: 'Welcome',
    user: { name: 'John', email: 'john@example.com' },
    items: ['Item 1', 'Item 2', 'Item 3']
  });
  
  const parsed = JSON.parse(result);
  if (parsed.success) {
    res.html(parsed.content);
  } else {
    res.status(500).json({ error: parsed.error });
  }
});
```

## Template Features

- **Variables** - `{{ variable }}`
- **Conditionals** - `{% if condition %}...{% endif %}`
- **Loops** - `{% for item in items %}...{% endfor %}`
- **Filters** - `{{ value | filter }}`
- **Macros** - `{% macro name() %}...{% endmacro %}`
- **Includes** - `{% include "partial.html" %}`
- **Inheritance** - `{% extends "base.html" %}`

## Template Options

```javascript
app.initTemplates('./templates/**/*.html', {
  autoescape: true,        // Auto-escape HTML
  // Add other Tera options as needed
});
```

## Next Steps

- [Syntax](./syntax.md) - Template syntax and features
- [Examples](./examples.md) - Practical template examples
- [API Reference](../api/) - Complete API documentation
