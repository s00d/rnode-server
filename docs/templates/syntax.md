# Template Syntax

## Variables

### Basic Variables
```html
<h1>{{ title }}</h1>
<p>Welcome, {{ user.name }}!</p>
<p>Email: {{ user.email }}</p>
```

### Nested Variables
```html
<div class="user-profile">
  <h2>{{ user.profile.displayName }}</h2>
  <p>{{ user.profile.bio | default(value="No bio available") }}</p>
</div>
```

### Array Access
```html
<ul>
  {% for item in items %}
    <li>{{ item }}</li>
  {% endfor %}
</ul>
```

## Conditionals

### Basic If
```html
{% if user.isLoggedIn %}
  <p>Welcome back, {{ user.name }}!</p>
{% else %}
  <p>Please <a href="/login">log in</a></p>
{% endif %}
```

### If-Else
```html
{% if user.role == "admin" %}
  <div class="admin-panel">
    <h3>Admin Controls</h3>
    <!-- Admin content -->
  </div>
{% elif user.role == "moderator" %}
  <div class="moderator-panel">
    <h3>Moderator Controls</h3>
    <!-- Moderator content -->
  </div>
{% else %}
  <p>Regular user access</p>
{% endif %}
```

### Complex Conditions
```html
{% if user.isActive and user.postCount > 0 %}
  <p>Active user with {{ user.postCount }} posts</p>
{% endif %}

{% if not user.isBanned %}
  <p>User can post comments</p>
{% endif %}
```

## Loops

### Basic For Loop
```html
<ul>
  {% for post in posts %}
    <li>
      <h3>{{ post.title }}</h3>
      <p>{{ post.excerpt }}</p>
      <small>By {{ post.author }} on {{ post.date }}</small>
    </li>
  {% endfor %}
</ul>
```

### Loop Variables
```html
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Name</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    {% for user in users %}
      <tr>
        <td>{{ loop.index }}</td>
        <td>{{ user.name }}</td>
        <td>{{ user.email }}</td>
      </tr>
    {% endfor %}
  </tbody>
</table>
```

### Nested Loops
```html
{% for category in categories %}
  <div class="category">
    <h2>{{ category.name }}</h2>
    <ul>
      {% for product in category.products %}
        <li>{{ product.name }} - ${{ product.price }}</li>
      {% endfor %}
    </ul>
  </div>
{% endfor %}
```

### Loop Control
```html
{% for item in items %}
  {% if loop.first %}
    <div class="first-item">{{ item }}</div>
  {% elif loop.last %}
    <div class="last-item">{{ item }}</div>
  {% else %}
    <div class="regular-item">{{ item }}</div>
  {% endif %}
{% endfor %}
```

## Filters

### String Filters
```html
<p>{{ title | upper }}</p>
<p>{{ description | truncate(length=100) }}</p>
<p>{{ name | default(value="Anonymous") }}</p>
```

### Number Filters
```html
<p>Price: ${{ price | round(precision=2) }}</p>
<p>Rating: {{ rating | round(precision=1) }}/5</p>
```

### Array Filters
```html
<p>Total items: {{ items | length }}</p>
<p>First item: {{ items | first }}</p>
<p>Last item: {{ items | last }}</p>
```

### Custom Filters
```html
<p>{{ date | date(format="%Y-%m-%d") }}</p>
<p>{{ text | markdown }}</p>
```

## Macros

### Basic Macro
```html
{% macro input(name, value="", type="text") %}
  <input type="{{ type }}" name="{{ name }}" value="{{ value }}">
{% endmacro %}

<!-- Usage -->
<form>
  {{ input("username") }}
  {{ input("password", type="password") }}
  {{ input("email", user.email, "email") }}
</form>
```

### Macro with Content
```html
{% macro card(title, content) %}
  <div class="card">
    <div class="card-header">
      <h3>{{ title }}</h3>
    </div>
    <div class="card-body">
      {{ content }}
    </div>
  </div>
{% endmacro %}

<!-- Usage -->
{{ card("Welcome", "This is the welcome message") }}
```

## Includes

### Basic Include
```html
<!-- header.html -->
<header>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
</header>

<!-- main.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
</head>
<body>
  {% include "header.html" %}
  
  <main>
    {{ content }}
  </main>
  
  {% include "footer.html" %}
</body>
</html>
```

### Include with Variables
```html
<!-- partial.html -->
<div class="alert alert-{{ type }}">
  {{ message }}
</div>

<!-- Usage -->
{% include "partial.html" %}
```

## Inheritance

### Base Template
```html
<!-- base.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}{{ title }}{% endblock %}</title>
  <link rel="stylesheet" href="/css/main.css">
  {% block head %}{% endblock %}
</head>
<body>
  <header>
    {% block header %}
      <h1>{% block header_title %}{{ site_name }}{% endblock %}</h1>
    {% endblock %}
  </header>
  
  <main>
    {% block content %}{% endblock %}
  </main>
  
  <footer>
    {% block footer %}
      <p>&copy; 2024 {{ site_name }}</p>
    {% endblock %}
  </footer>
  
  <script src="/js/main.js"></script>
  {% block scripts %}{% endblock %}
</body>
</html>
```

### Child Template
```html
<!-- page.html -->
{% extends "base.html" %}

{% block title %}About - {{ super() }}{% endblock %}

{% block header_title %}About Us{% endblock %}

{% block content %}
<div class="about-page">
  <h2>About {{ company_name }}</h2>
  <p>{{ company_description }}</p>
  
  <h3>Our Team</h3>
  <ul>
    {% for member in team %}
      <li>{{ member.name }} - {{ member.role }}</li>
    {% endfor %}
  </ul>
</div>
{% endblock %}

{% block scripts %}
<script src="/js/about.js"></script>
{% endblock %}
```

## Comments

### HTML Comments
```html
<!-- This is an HTML comment -->
<h1>{{ title }}</h1>
```

### Tera Comments
```html
{# This is a Tera comment - not rendered in output #}
<h1>{{ title }}</h1>
```

## Escaping

### Auto-escape
```html
<!-- With autoescape: true -->
<p>{{ user_input }}</p>
<!-- Output: <script>alert('xss')</script> becomes &lt;script&gt;alert('xss')&lt;/script&gt; -->

<!-- Without autoescape -->
<p>{{ user_input | safe }}</p>
<!-- Output: <script>alert('xss')</script> rendered as HTML -->
```

### Manual Escaping
```html
<p>{{ user_input | escape }}</p>
<p>{{ user_input | safe }}</p>
```

## Next Steps

- [Examples](./examples.md) - Practical template examples
- [API Reference](../api/) - Template API methods
- [Examples](../examples/) - Code examples
