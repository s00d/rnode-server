use serde_json::{Map, Value as JsonValue};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct TemplateContext {
    data: HashMap<String, JsonValue>,
}

impl TemplateContext {
    /// Create a new empty template context
    pub fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }

    /// Add a string value to the context
    pub fn with_string(mut self, key: &str, value: &str) -> Self {
        self.data.insert(key.to_string(), JsonValue::String(value.to_string()));
        self
    }

    /// Add a number value to the context
    pub fn with_number(mut self, key: &str, value: impl Into<f64>) -> Self {
        let num = value.into();
        // Handle f64 to serde_json::Number conversion
        if num.fract() == 0.0 && num >= i64::MIN as f64 && num <= i64::MAX as f64 {
            self.data.insert(key.to_string(), JsonValue::Number((num as i64).into()));
        } else {
            // For non-integer f64, we need to handle this differently
            // serde_json doesn't support f64 directly, so we'll use string representation
            self.data.insert(key.to_string(), JsonValue::String(num.to_string()));
        }
        self
    }

    /// Add a boolean value to the context
    pub fn with_bool(mut self, key: &str, value: bool) -> Self {
        self.data.insert(key.to_string(), JsonValue::Bool(value));
        self
    }

    /// Add a null value to the context
    pub fn with_null(mut self, key: &str) -> Self {
        self.data.insert(key.to_string(), JsonValue::Null);
        self
    }

    /// Add an array value to the context
    pub fn with_array(mut self, key: &str, values: Vec<JsonValue>) -> Self {
        self.data.insert(key.to_string(), JsonValue::Array(values));
        self
    }

    /// Add an array of strings to the context
    pub fn with_string_array(mut self, key: &str, values: Vec<&str>) -> Self {
        let json_values: Vec<JsonValue> = values
            .into_iter()
            .map(|s| JsonValue::String(s.to_string()))
            .collect();
        self.data.insert(key.to_string(), JsonValue::Array(json_values));
        self
    }

    /// Add an array of numbers to the context
    pub fn with_number_array(mut self, key: &str, values: Vec<f64>) -> Self {
        let json_values: Vec<JsonValue> = values
            .into_iter()
            .map(|n| {
                if n.fract() == 0.0 && n >= i64::MIN as f64 && n <= i64::MAX as f64 {
                    JsonValue::Number((n as i64).into())
                } else {
                    JsonValue::String(n.to_string())
                }
            })
            .collect();
        self.data.insert(key.to_string(), JsonValue::Array(json_values));
        self
    }

    /// Add an object value to the context using a builder function
    pub fn with_object<F>(mut self, key: &str, builder: F) -> Self
    where
        F: FnOnce(TemplateContext) -> TemplateContext,
    {
        let nested_context = builder(TemplateContext::new());
        self.data.insert(key.to_string(), JsonValue::Object(nested_context.into_map()));
        self
    }

    /// Add a raw JSON value to the context
    pub fn with_value(mut self, key: &str, value: JsonValue) -> Self {
        self.data.insert(key.to_string(), value);
        self
    }

    /// Add multiple values from a HashMap
    pub fn with_map(mut self, map: HashMap<String, JsonValue>) -> Self {
        for (key, value) in map {
            self.data.insert(key, value);
        }
        self
    }

    /// Build the final context HashMap
    pub fn build(self) -> HashMap<String, JsonValue> {
        self.data
    }

    /// Convert the context to a serde_json::Map
    pub fn into_map(self) -> Map<String, JsonValue> {
        let mut map = Map::new();
        for (key, value) in self.data {
            map.insert(key, value);
        }
        map
    }

    /// Get a reference to the underlying data
    pub fn data(&self) -> &HashMap<String, JsonValue> {
        &self.data
    }

    /// Get a mutable reference to the underlying data
    pub fn data_mut(&mut self) -> &mut HashMap<String, JsonValue> {
        &mut self.data
    }

    /// Check if the context contains a specific key
    pub fn has_key(&self, key: &str) -> bool {
        self.data.contains_key(key)
    }

    /// Get the number of items in the context
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Check if the context is empty
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

impl Default for TemplateContext {
    fn default() -> Self {
        Self::new()
    }
}

impl From<HashMap<String, JsonValue>> for TemplateContext {
    fn from(data: HashMap<String, JsonValue>) -> Self {
        Self { data }
    }
}

impl From<TemplateContext> for HashMap<String, JsonValue> {
    fn from(context: TemplateContext) -> Self {
        context.data
    }
}
