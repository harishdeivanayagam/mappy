# Mappy

Mappy is an intelligent unified API generator that simplifies the process of building customer-facing native integrations. It provides a seamless way to integrate with multiple platforms (like CRM, HRMS, etc) through a single, unified API interface.


## 🌟 Features

- **Unified API Interface**: Write once, integrate with multiple platforms
- **AI-Powered ETL**: Automatic mapping and transformation of data between different platforms (Using API `/mappings` endpoint)
- **Simple Configuration**: Easy to set up new integrations using YAML configuration
- **OAuth2 Support**: Secure authentication with various platforms
- **Webhook Support**: Receive and process webhooks from platforms
- **Extensible**: Easy to add new integrations and endpoints


**Refer postman collection `Mappy.postman_collection.json` for API endpoint documentation**


## 🚀 Prebuilt Integrations
prebuilt tools.yml (coming soon)
prebuilt endpoints.yml (coming soon)

## 📖 Configuration

### Tools Configuration (tools.yml)

Tools configuration defines the authentication and connection details for each integrated platform.

```yaml
tools:
name: platform_name
auth: oauth2
auth_info:
client_id: your_client_id
client_secret: your_client_secret
redirect_uri: your_callback_url
scopes:
scope1
scope2  
```

### Endpoints Configuration (endpoints.yml)
Endpoints configuration defines the unified API endpoints and their mapping to platform-specific APIs.

```yaml
endpoints:
name: endpoint_name
description: Description of the endpoint
input_json_format: {
field: type
}
tools:
name: platform_name
url: api_endpoint_url
method: HTTP_METHOD
body/query_params: {
field: type
}
```

## 🔧 Getting Started

1. Clone the repository
2. Install dependencies

```bash
npm install
```

3. Configure your `tools.yml` with platform credentials
4. Define your endpoints in `endpoints.yml`
5. Define your webhooks in `webhooks.yml`
6. Start the server

```bash
npm start
```

## 📝 Example Usage

### Reading Contacts

```bash
curl -X POST http://your-api/read_contacts \
-H "Content-Type: application/json" \
-d '{"limit": 10}'
```

```json
{
"contacts": [
{
"id": "123",
"name": "John Doe"
}
]
}
```

## 🛠️ Technical Stack

- Node.js
- TypeScript
- OpenAI
- YAML Configuration
- OAuth2 Authentication
- Jsonata for JSON transformations `/mappings` endpoint for AI powered automated transformation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📫 Contact

For questions and support, please open an issue in the GitHub repository.


**Note: This is a work in progress and the project is not ready for production use.**

---

Made with ❤️ By Harish to simplify integrations