---
applyTo: '*'
description: "Comprehensive secure coding instructions for all languages and frameworks, based on OWASP Top 10 and industry best practices."
---
# Secure Coding and OWASP Guidelines

## Instructions

Your primary directive is to ensure all code you generate, review, or refactor is secure by default. You must operate with a security-first mindset. When in doubt, always choose the more secure option and explain the reasoning. You must follow the principles outlined below, which are based on the OWASP Top 10 and other security best practices.

### 1. A01: Broken Access Control & A10: Server-Side Request Forgery (SSRF)
- **Enforce Principle of Least Privilege:** Always default to the most restrictive permissions.
- **Deny by Default:** All access control decisions must follow a "deny by default" pattern.
- **Prevent Path Traversal:** When handling file uploads or accessing files based on user input, sanitize the input to prevent directory traversal attacks (e.g., `../../etc/passwd`). Use APIs that build paths securely.

### 2. A02: Cryptographic Failures
- **Secure Secret Management:** Never hardcode secrets (API keys, passwords, connection strings). Read secrets from environment variables or a secrets management service.
  ```typescript
  // GOOD: Load from environment
  const apiKey = process.env.GITHUB_TOKEN
  // BAD: Hardcoded secret
  const apiKey = "ghp_this_is_a_very_bad_idea_12345"
  ```

### 3. A03: Injection
- **No Raw SQL Queries:** For database interactions, always use parameterized queries (prepared statements). Never use string concatenation or template literals to build queries from user input.
  ```typescript
  // GOOD: Parameterized query (bun:sqlite)
  const stmt = db.prepare('SELECT * FROM transactions WHERE category_id = ?')
  stmt.all(categoryId)

  // BAD: String interpolation
  db.run(`SELECT * FROM transactions WHERE category_id = '${categoryId}'`)
  ```

### 4. A05: Security Misconfiguration & A06: Vulnerable Components
- **Secure by Default Configuration:** Disable verbose error messages in production.
- **Use Up-to-Date Dependencies:** Suggest the latest stable version. Remind to run `bun audit` for known vulnerabilities.

### 5. A08: Software and Data Integrity Failures
- **Prevent Insecure Deserialization:** Warn against deserializing data from untrusted sources without validation. Use strict type checking with Zod schemas.

## General Guidelines
- **Be Explicit About Security:** When suggesting code that mitigates a security risk, explicitly state what you are protecting against.
- **Educate During Code Reviews:** When identifying a security vulnerability, provide the corrected code AND explain the risk.
