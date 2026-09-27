import { gatewayUrl } from './format';

export type SnippetLanguage = 'curl' | 'javascript' | 'python' | 'csharp';

export const snippetLanguages: SnippetLanguage[] = ['curl', 'javascript', 'python', 'csharp'];

/** Chat-completion examples for the OpenAI-compatible gateway. */
export function chatSnippet(
  language: SnippetLanguage,
  apiKey = 'YOUR_API_KEY',
  model = 'gpt-4o-mini',
): string {
  const base = `${gatewayUrl()}/v1`;
  switch (language) {
    case 'curl':
      return `curl ${base}/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Write a short bedtime story"}]
  }'`;
    case 'javascript':
      return `import OpenAI from "openai";

// The same client works for Claude, Gemini, DeepSeek, ...
const client = new OpenAI({
  apiKey: "${apiKey}",
  baseURL: "${base}",
});

const response = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "Write a short bedtime story" }],
});

console.log(response.choices[0].message.content);`;
    case 'python':
      return `from openai import OpenAI

# This client can be used for other model providers
# as well, like google, anthropic, etc..
client = OpenAI(
    api_key="${apiKey}",
    base_url="${base}"
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Write a short bedtime story"}]
)

print(response.choices[0].message.content)`;
    case 'csharp':
      return `using OpenAI;
using OpenAI.Chat;
using System.ClientModel;

var client = new ChatClient(
    model: "${model}",
    credential: new ApiKeyCredential("${apiKey}"),
    options: new OpenAIClientOptions { Endpoint = new Uri("${base}") }
);

ChatCompletion completion = client.CompleteChat("Write a short bedtime story");

Console.WriteLine(completion.Content[0].Text);`;
  }
}

const keywords: Record<SnippetLanguage, string[]> = {
  python: [
    'from',
    'import',
    'as',
    'def',
    'return',
    'print',
    'for',
    'in',
    'if',
    'else',
    'with',
    'None',
    'True',
    'False',
  ],
  javascript: [
    'import',
    'from',
    'const',
    'let',
    'await',
    'async',
    'new',
    'return',
    'function',
    'export',
  ],
  csharp: ['using', 'var', 'new', 'await', 'async', 'return', 'public', 'class'],
  curl: ['curl'],
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Minimal highlighter: comments, strings, keywords and flags. Output is escaped HTML. */
export function highlight(code: string, language: SnippetLanguage): string {
  const words = keywords[language].join('|');
  const pattern = new RegExp(
    `(#[^\\n]*|//[^\\n]*)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|\\b(${words})\\b|(\\s-{1,2}[A-Za-z]+)`,
    'g',
  );
  let html = '';
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    const index = match.index;
    html += escapeHtml(code.slice(last, index));
    const [token, comment, string, keyword] = match;
    const kind = comment ? 'c' : string ? 's' : keyword ? 'k' : 'f';
    html += `<span class="tok-${kind}">${escapeHtml(token)}</span>`;
    last = index + token.length;
  }
  return html + escapeHtml(code.slice(last));
}
