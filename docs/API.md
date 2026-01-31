# API Documentation

## Base URL

```
http://localhost:3000/api/agent
```

For production, replace with your deployed URL.

## Authentication

Currently, the API does not require authentication. For production use, implement API key authentication or OAuth.

## Endpoints

### 1. Translate Text

**Endpoint**: `POST /api/agent/translate`

**Description**: Translates text to a target language using Groq LLM.

**Request Body**:
```json
{
  "text": "Hello, how are you?",
  "targetLanguage": "Spanish"
}
```

**Parameters**:
- `text` (string, required): Text to translate (max 10,000 characters)
- `targetLanguage` (string, optional): Target language (default: "English")

**Response**:
```json
{
  "success": true,
  "result": "Hola, ¿cómo estás?",
  "action": "translate",
  "targetLanguage": "Spanish"
}
```

**Error Response**:
```json
{
  "error": "Text is required and must be a string"
}
```

**Status Codes**:
- `200`: Success
- `400`: Bad request (invalid input)
- `500`: Server error

---

### 2. Summarize Text

**Endpoint**: `POST /api/agent/summarize`

**Description**: Creates a concise summary of the provided text.

**Request Body**:
```json
{
  "text": "Long article text here..."
}
```

**Parameters**:
- `text` (string, required): Text to summarize (max 20,000 characters)

**Response**:
```json
{
  "success": true,
  "result": "This article discusses...",
  "action": "summarize"
}
```

---

### 3. Explain Text

**Endpoint**: `POST /api/agent/explain`

**Description**: Explains complex text in simple, easy-to-understand terms.

**Request Body**:
```json
{
  "text": "Quantum entanglement is a physical phenomenon..."
}
```

**Parameters**:
- `text` (string, required): Text to explain (max 10,000 characters)

**Response**:
```json
{
  "success": true,
  "result": "Quantum entanglement is when two particles...",
  "action": "explain"
}
```

---

### 4. Rewrite Text

**Endpoint**: `POST /api/agent/rewrite`

**Description**: Rewrites text in a specified style or tone.

**Request Body**:
```json
{
  "text": "I need help with this task",
  "style": "professional"
}
```

**Parameters**:
- `text` (string, required): Text to rewrite (max 10,000 characters)
- `style` (string, optional): Writing style (default: "professional")
  - Options: "professional", "casual", "formal", "friendly", "concise"

**Response**:
```json
{
  "success": true,
  "result": "I would appreciate assistance with this assignment.",
  "action": "rewrite",
  "style": "professional"
}
```

---

### 5. Generate Task

**Endpoint**: `POST /api/agent/generate-task`

**Description**: Converts text into a structured task with title, description, and priority.

**Request Body**:
```json
{
  "text": "Need to fix the login bug by Friday"
}
```

**Parameters**:
- `text` (string, required): Text to convert to task (max 5,000 characters)

**Response**:
```json
{
  "success": true,
  "result": {
    "title": "Fix Login Bug",
    "description": "Resolve the login authentication issue before the Friday deadline",
    "priority": "high"
  },
  "action": "generate-task"
}
```

---

### 6. Generate Email

**Endpoint**: `POST /api/agent/generate-email`

**Description**: Creates an email draft from notes or ideas.

**Request Body**:
```json
{
  "text": "Tell client the project will be delayed by 2 weeks",
  "tone": "professional"
}
```

**Parameters**:
- `text` (string, required): Content to convert to email (max 5,000 characters)
- `tone` (string, optional): Email tone (default: "professional")
  - Options: "professional", "friendly", "formal", "apologetic"

**Response**:
```json
{
  "success": true,
  "result": {
    "subject": "Project Timeline Update",
    "body": "Dear Client,\n\nI wanted to inform you that..."
  },
  "action": "generate-email",
  "tone": "professional"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production:
- Implement rate limiting per IP or API key
- Suggested: 100 requests per hour per user
- Use Redis for distributed rate limiting

## Error Handling

All endpoints follow a consistent error format:

```json
{
  "error": "Error message here"
}
```

Common error scenarios:
- Missing required fields
- Text too long
- Invalid parameters
- API service unavailable
- LLM API errors

## CORS

CORS is enabled for all origins (`*`) to allow extension communication. For production:
- Restrict to specific origins
- Implement proper authentication
- Use environment-based CORS configuration

## Examples

### cURL Example

```bash
curl -X POST http://localhost:3000/api/agent/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "targetLanguage": "French"
  }'
```

### JavaScript Example

```javascript
const response = await fetch('http://localhost:3000/api/agent/translate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello world',
    targetLanguage: 'French',
  }),
});

const data = await response.json();
console.log(data.result);
```

### Extension Usage

```typescript
// From background worker
chrome.runtime.sendMessage({
  type: 'API_REQUEST',
  payload: {
    action: 'translate',
    text: 'Hello world',
    options: { targetLanguage: 'French' }
  }
}, (response) => {
  if (response.success) {
    console.log(response.data.result);
  }
});
```

## Performance

- Average response time: 1-3 seconds (depends on Groq API)
- Groq API uses LLaMA 3 for fast inference
- Timeout: 30 seconds
- Max concurrent requests: Based on Groq API limits

## Future Enhancements

- [ ] Streaming responses for long-form content
- [ ] Batch processing multiple texts
- [ ] Custom model selection
- [ ] Response caching
- [ ] Webhook support for async processing
