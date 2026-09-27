<script setup lang="ts">
import { computed, ref } from 'vue';
import { gatewayUrl } from '../format';
import CopyText from './CopyText.vue';

const props = withDefaults(defineProps<{ apiKey?: string; model?: string }>(), {
  apiKey: 'sk-aia-...',
  model: 'gpt-4o-mini',
});

const tab = ref<'python' | 'node' | 'curl' | 'anthropic'>('python');
const base = gatewayUrl();

const snippets = computed(() => ({
  python: `from openai import OpenAI

client = OpenAI(base_url="${base}/v1", api_key="${props.apiKey}")

response = client.chat.completions.create(
    model="${props.model}",
    messages=[{"role": "user", "content": "سلام!"}],
)
print(response.choices[0].message.content)`,
  node: `import OpenAI from 'openai';

const client = new OpenAI({ baseURL: '${base}/v1', apiKey: '${props.apiKey}' });

const response = await client.chat.completions.create({
  model: '${props.model}',
  messages: [{ role: 'user', content: 'سلام!' }],
});
console.log(response.choices[0].message.content);`,
  curl: `curl ${base}/v1/chat/completions \\
  -H "Authorization: Bearer ${props.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${props.model}", "messages": [{"role": "user", "content": "سلام!"}]}'`,
  anthropic: `import anthropic

# API اختصاصی Claude (Messages) — فقط برای مدل‌های Anthropic
client = anthropic.Anthropic(base_url="${base}", api_key="${props.apiKey}")

message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "سلام!"}],
)
print(message.content[0].text)`,
}));
</script>

<template>
  <div>
    <div class="row items-center no-wrap">
      <q-tabs
        v-model="tab"
        dense
        no-caps
        align="left"
        class="col text-grey-8"
        active-color="primary"
        indicator-color="primary"
      >
        <q-tab name="python" label="Python" />
        <q-tab name="node" label="Node.js" />
        <q-tab name="curl" label="cURL" />
        <q-tab name="anthropic" label="Claude SDK" />
      </q-tabs>
      <CopyText :text="snippets[tab]" label="کپی کد" />
    </div>
    <pre class="code-block q-mt-sm">{{ snippets[tab] }}</pre>
  </div>
</template>
