# Project Instructions

### Core Rules (Mandatory)
1. **Maximum Brevity & Optimization**: Write the shortest, cleanest, and most idiomatic code possible. Never introduce unnecessary wrappers, duplicate logic, or dead boilerplate.
2. **Anti-Slop**: No generic AI gradients, glowing backdrops, emoji badges, sparkles, or bloated decorative elements.

### Security Standards & Best Practices
1. **XSS & Injection Defense**:
   - Never use `dangerouslySetInnerHTML`, `eval()`, or `new Function()` with untrusted data.
   - Always sanitize HTML with a vetted sanitizer (e.g., DOMPurify) if raw HTML rendering is strictly required.
   - Disallow `javascript:` pseudo-protocols in links and sources; validate all external URLs.
2. **Tabnabbing & External Links**:
   - Always enforce `rel="noopener noreferrer"` on all `target="_blank"` anchor tags.
3. **Storage & Secrets**:
   - Never store sensitive authentication tokens, passwords, or API secrets in `localStorage` or `sessionStorage`.
   - Never expose private credentials in client-side bundles or repository files.
4. **Input Validation**:
   - Validate and type-check all runtime external payloads (API responses, URL params, form inputs) before processing.
5. **Frame & Header Protection**:
   - Respect CSP, `X-Frame-Options`, `nosniff`, and `Referrer-Policy` constraints.
