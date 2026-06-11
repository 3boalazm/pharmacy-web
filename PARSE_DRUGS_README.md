Usage
-----

This script reads `الاصناف.xlsx` and produces `الاصناف_المعدلة.xlsx` using the OpenAI API.

Setup:

1. Copy `.env.example` to `.env` and set your OpenAI API key:

```bash
cp .env.example .env
# then edit .env and set OPENAI_API_KEY
```

2. Install dependencies (if not already):

```bash
npm install
```

Run:

```bash
node parse-drugs.js
```

Notes:
- Do NOT commit your `.env` file. The repo `.gitignore` already ignores it.
- The script expects `الاصناف.xlsx` in the workspace root. Output is `الاصناف_المعدلة.xlsx`.
