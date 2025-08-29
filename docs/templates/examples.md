# Template Examples

## Overview

Practical examples of using Tera templates with RNode Server.

## Basic Examples

### Simple Welcome Page
```html
<!-- templates/welcome.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .welcome { text-align: center; }
    .user-info { background: #f5f5f5; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="welcome">
    <h1>{{ title }}</h1>
    <p>Welcome to our application!</p>
  </div>
  
  <div class="user-info">
    <h2>User Information</h2>
    <p><strong>Name:</strong> {{ user.name }}</p>
    <p><strong>Email:</strong> {{ user.email }}</p>
    <p><strong>Member since:</strong> {{ user.joinDate }}</p>
  </div>
  
  <div class="stats">
    <h2>Your Statistics</h2>
    <p>Total posts: {{ stats.postCount }}</p>
    <p>Total comments: {{ stats.commentCount }}</p>
    <p>Last activity: {{ stats.lastActivity }}</p>
  </div>
</body>
</html>
```

### Server-side Rendering
```javascript
app.get('/welcome', (req, res) => {
  const result = app.renderTemplate('welcome.html', {
    title: 'Welcome to RNode Server',
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      joinDate: '2024-01-15'
    },
    stats: {
      postCount: 42,
      commentCount: 128,
      lastActivity: '2 hours ago'
    }
  });
  
  const parsed = JSON.parse(result);
  if (parsed.success) {
    res.html(parsed.content);
  } else {
    res.status(500).json({ error: parsed.error });
  }
});
```

## Advanced Examples

### Blog Post Template
```html
<!-- templates/post.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{{ post.title }} - {{ site.name }}</title>
  <meta name="description" content="{{ post.excerpt }}">
  <style>
    .post { max-width: 800px; margin: 0 auto; padding: 20px; }
    .post-header { border-bottom: 2px solid #eee; padding-bottom: 20px; }
    .post-meta { color: #666; font-size: 14px; }
    .post-content { line-height: 1.6; }
    .post-tags { margin-top: 30px; }
    .tag { background: #007bff; color: white; padding: 4px 8px; border-radius: 4px; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="post">
    <header class="post-header">
      <h1>{{ post.title }}</h1>
      <div class="post-meta">
        <span>By {{ post.author.name }}</span>
        <span>•</span>
        <span>{{ post.publishDate | date(format="%B %d, %Y") }}</span>
        <span>•</span>
        <span>{{ post.readTime }} min read</span>
      </div>
    </header>
    
    <div class="post-content">
      {{ post.content | safe }}
    </div>
    
    {% if post.tags %}
    <div class="post-tags">
      <strong>Tags:</strong>
      {% for tag in post.tags %}
        <span class="tag">{{ tag }}</span>
      {% endfor %}
    </div>
    {% endif %}
    
    {% if post.comments %}
    <div class="comments">
      <h3>Comments ({{ post.comments | length }})</h3>
      {% for comment in post.comments %}
        <div class="comment">
          <strong>{{ comment.author }}</strong>
          <small>{{ comment.date | date(format="%Y-%m-%d %H:%M") }}</small>
          <p>{{ comment.content }}</p>
        </div>
      {% endfor %}
    </div>
    {% endif %}
  </div>
</body>
</html>
```

### User Dashboard Template
```html
<!-- templates/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard - {{ user.name }}</title>
  <style>
    .dashboard { display: grid; grid-template-columns: 250px 1fr; gap: 20px; }
    .sidebar { background: #f8f9fa; padding: 20px; }
    .main-content { padding: 20px; }
    .card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .stat-card { text-align: center; padding: 20px; background: #007bff; color: white; border-radius: 8px; }
    .stat-number { font-size: 2em; font-weight: bold; }
  </style>
</head>
<body>
  <div class="dashboard">
    <aside class="sidebar">
      <div class="user-profile">
        <h3>{{ user.name }}</h3>
        <p>{{ user.email }}</p>
        <p><strong>Role:</strong> {{ user.role | title }}</p>
        <p><strong>Member since:</strong> {{ user.joinDate | date(format="%B %Y") }}</p>
      </div>
      
      <nav class="sidebar-nav">
        <ul>
          <li><a href="/dashboard">Overview</a></li>
          <li><a href="/dashboard/posts">My Posts</a></li>
          <li><a href="/dashboard/comments">My Comments</a></li>
          <li><a href="/dashboard/settings">Settings</a></li>
        </ul>
      </nav>
    </aside>
    
    <main class="main-content">
      <h1>Welcome back, {{ user.name }}!</h1>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ stats.totalPosts }}</div>
          <div class="stat-label">Total Posts</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.totalComments }}</div>
          <div class="stat-label">Total Comments</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.totalViews }}</div>
          <div class="stat-label">Total Views</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.thisMonth }}</div>
          <div class="stat-label">This Month</div>
        </div>
      </div>
      
      {% if recentPosts %}
      <div class="card">
        <h3>Recent Posts</h3>
        <ul>
          {% for post in recentPosts %}
            <li>
              <a href="/post/{{ post.id }}">{{ post.title }}</a>
              <small>{{ post.publishDate | date(format="%Y-%m-%d") }}</small>
            </li>
          {% endfor %}
        </ul>
      </div>
      {% endif %}
      
      {% if recentActivity %}
      <div class="card">
        <h3>Recent Activity</h3>
        <ul>
          {% for activity in recentActivity %}
            <li>
              <span class="activity-type">{{ activity.type }}</span>
              <span class="activity-desc">{{ activity.description }}</span>
              <small>{{ activity.date | date(format="%H:%M") }}</small>
            </li>
          {% endfor %}
        </ul>
      </div>
      {% endif %}
    </main>
  </div>
</body>
</html>
```

## Form Templates

### Contact Form
```html
<!-- templates/contact.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Contact Us - {{ site.name }}</title>
  <style>
    .contact-form { max-width: 600px; margin: 0 auto; padding: 20px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input, textarea, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
    .error { color: #dc3545; font-size: 14px; }
    .success { color: #28a745; font-size: 14px; }
  </style>
</head>
<body>
  <div class="contact-form">
    <h1>Contact Us</h1>
    
    {% if message %}
      <div class="{% if success %}success{% else %}error{% endif %}">
        {{ message }}
      </div>
    {% endif %}
    
    <form method="POST" action="/contact">
      <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" name="name" value="{{ form.name | default(value='') }}" required>
        {% if errors.name %}
          <div class="error">{{ errors.name }}</div>
        {% endif %}
      </div>
      
      <div class="form-group">
        <label for="email">Email *</label>
        <input type="email" id="email" name="email" value="{{ form.email | default(value='') }}" required>
        {% if errors.email %}
          <div class="error">{{ errors.email }}</div>
        {% endif %}
      </div>
      
      <div class="form-group">
        <label for="subject">Subject</label>
        <select id="subject" name="subject">
          <option value="">Select a subject</option>
          <option value="general" {% if form.subject == "general" %}selected{% endif %}>General Inquiry</option>
          <option value="support" {% if form.subject == "support" %}selected{% endif %}>Technical Support</option>
          <option value="feedback" {% if form.subject == "feedback" %}selected{% endif %}>Feedback</option>
          <option value="other" {% if form.subject == "other" %}selected{% endif %}>Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" name="message" rows="6" required>{{ form.message | default(value='') }}</textarea>
        {% if errors.message %}
          <div class="error">{{ errors.message }}</div>
        {% endif %}
      </div>
      
      <button type="submit">Send Message</button>
    </form>
  </div>
</body>
</html>
```

## E-commerce Templates

### Product List
```html
<!-- templates/products.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{{ category.name }} - {{ site.name }}</title>
  <style>
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
    .product-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
    .product-image { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; }
    .product-price { font-size: 1.2em; font-weight: bold; color: #007bff; }
    .product-title { margin: 10px 0; }
    .filters { margin-bottom: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>{{ category.name }}</h1>
  
  <div class="filters">
    <form method="GET" action="/products/{{ category.slug }}">
      <label>Price Range:</label>
      <input type="number" name="min_price" value="{{ filters.minPrice | default(value='') }}" placeholder="Min">
      <input type="number" name="max_price" value="{{ filters.maxPrice | default(value='') }}" placeholder="Max">
      
      <label>Sort by:</label>
      <select name="sort">
        <option value="name" {% if filters.sort == "name" %}selected{% endif %}>Name</option>
        <option value="price_low" {% if filters.sort == "price_low" %}selected{% endif %}>Price: Low to High</option>
        <option value="price_high" {% if filters.sort == "price_high" %}selected{% endif %}>Price: High to Low</option>
        <option value="newest" {% if filters.sort == "newest" %}selected{% endif %}>Newest</option>
      </select>
      
      <button type="submit">Apply Filters</button>
    </form>
  </div>
  
  <div class="products-grid">
    {% for product in products %}
      <div class="product-card">
        <img src="{{ product.image }}" alt="{{ product.name }}" class="product-image">
        <h3 class="product-title">{{ product.name }}</h3>
        <p class="product-price">${{ product.price | round(precision=2) }}</p>
        <p>{{ product.description | truncate(length=100) }}</p>
        
        {% if product.inStock %}
          <button onclick="addToCart({{ product.id }})">Add to Cart</button>
        {% else %}
          <span class="out-of-stock">Out of Stock</span>
        {% endif %}
      </div>
    {% endfor %}
  </div>
  
  {% if pagination %}
  <div class="pagination">
    {% if pagination.prevPage %}
      <a href="?page={{ pagination.prevPage }}">Previous</a>
    {% endif %}
    
    <span>Page {{ pagination.currentPage }} of {{ pagination.totalPages }}</span>
    
    {% if pagination.nextPage %}
      <a href="?page={{ pagination.nextPage }}">Next</a>
    {% endif %}
  </div>
  {% endif %}
</body>
</html>
```

## Next Steps

- [Syntax](./syntax.md) - Template syntax and features
- [API Reference](../api/) - Template API methods
- [Examples](../examples/) - Code examples
