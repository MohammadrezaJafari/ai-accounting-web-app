import { gatewayUrl } from './format';

export interface GuideStep {
  text: string;
  code?: string;
}

export interface Guide {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  intro: string;
  steps: () => GuideStep[];
}

const base = () => `${gatewayUrl()}/v1`;

/** Integration guides shown under «موارد استفاده» and on the dashboard's quick access. */
export const guides: Guide[] = [
  {
    slug: 'cursor',
    title: 'استفاده در Cursor',
    subtitle: 'اتصال مدل‌ها به ویرایشگر Cursor برای کدنویسی',
    icon: 'code',
    intro:
      'Cursor اجازه می‌دهد آدرس API سازگار با OpenAI را عوض کنید تا مدل‌های ما در چت و Composer در دسترس باشند.',
    steps: () => [
      { text: 'در Cursor به Settings → Models بروید.' },
      {
        text: 'در بخش OpenAI API Key کلید خود را وارد کنید و گزینهٔ Override OpenAI Base URL را روشن کنید:',
        code: base(),
      },
      {
        text: 'با Add Model شناسهٔ مدل را دقیقاً مثل صفحهٔ «مدل‌ها و قیمت» اضافه کنید، مثلاً:',
        code: 'claude-sonnet-4-5',
      },
      { text: 'Verify را بزنید و مدل را در چت انتخاب کنید.' },
    ],
  },
  {
    slug: 'cline',
    title: 'استفاده در Cline',
    subtitle: 'ساخت اپلیکیشن با Cline و مدل‌های ما',
    icon: 'smart_toy',
    intro: 'Cline (افزونهٔ VS Code) از ارائه‌دهندهٔ «OpenAI Compatible» پشتیبانی می‌کند.',
    steps: () => [
      { text: 'در تنظیمات Cline، API Provider را روی OpenAI Compatible بگذارید.' },
      { text: 'Base URL:', code: base() },
      { text: 'API Key را از صفحهٔ «کلیدهای API» بسازید و وارد کنید.' },
      { text: 'Model ID را وارد کنید، مثلاً:', code: 'claude-sonnet-4-5' },
    ],
  },
  {
    slug: 'claude-code',
    title: 'استفاده در Claude Code',
    subtitle: 'استفاده از Claude Code برای کدنویسی با کیف پول شما',
    icon: 'auto_awesome',
    intro:
      'Claude Code با API اختصاصی Anthropic (/v1/messages) کار می‌کند که روی همین gateway فعال است؛ فقط کافی است آدرس و کلید را تنظیم کنید.',
    steps: () => [
      {
        text: 'متغیرهای محیطی را قبل از اجرای claude تنظیم کنید:',
        code: `export ANTHROPIC_BASE_URL="${gatewayUrl()}"
export ANTHROPIC_AUTH_TOKEN="YOUR_API_KEY"
export ANTHROPIC_MODEL="claude-sonnet-4-5"
export ANTHROPIC_SMALL_FAST_MODEL="claude-haiku-4-5"`,
      },
      { text: 'Claude Code را اجرا کنید:', code: 'claude' },
      { text: 'هزینهٔ هر درخواست در «لاگ درخواست‌ها» با نام کلید شما ثبت می‌شود.' },
    ],
  },
  {
    slug: 'n8n',
    title: 'استفاده در n8n',
    subtitle: 'اتصال به n8n برای اتوماسیون workflow',
    icon: 'account_tree',
    intro: 'در n8n از نود OpenAI Chat Model با credential سفارشی استفاده کنید.',
    steps: () => [
      { text: 'Credentials → New → OpenAI API را بسازید.' },
      { text: 'API Key را وارد کنید و در Base URL این آدرس را بگذارید:', code: base() },
      {
        text: 'در نود OpenAI Chat Model، گزینهٔ Model را روی By ID بگذارید و شناسهٔ مدل را بنویسید، مثلاً:',
        code: 'gpt-4o-mini',
      },
    ],
  },
  {
    slug: 'openwebui',
    title: 'استفاده در OpenWebUI',
    subtitle: 'اتصال رابط خودمیزبان OpenWebUI به چت، تصویر و RAG',
    icon: 'forum',
    intro: 'OpenWebUI هر API سازگار با OpenAI را به‌عنوان «Connection» می‌پذیرد.',
    steps: () => [
      {
        text: 'با Docker و متغیرهای زیر اجرا کنید:',
        code: `docker run -d -p 3000:8080 \\
  -e OPENAI_API_BASE_URL="${base()}" \\
  -e OPENAI_API_KEY="YOUR_API_KEY" \\
  ghcr.io/open-webui/open-webui:main`,
      },
      {
        text: 'یا از Admin Settings → Connections همین آدرس و کلید را اضافه کنید. فهرست مدل‌ها از /v1/models خوانده می‌شود.',
      },
    ],
  },
  {
    slug: 'api',
    title: 'API Reference',
    subtitle: 'مرجع endpointها، احراز هویت و خطاها',
    icon: 'integration_instructions',
    intro:
      'همهٔ درخواست‌ها با کلید API در هدر Authorization: Bearer (یا x-api-key) احراز هویت می‌شوند.',
    steps: () => [
      { text: 'فهرست مدل‌هایی که کلید شما اجازه دارد:', code: `GET ${base()}/models` },
      {
        text: 'چت (قالب OpenAI، برای همهٔ مدل‌ها، با پشتیبانی از "stream": true):',
        code: `POST ${base()}/chat/completions`,
      },
      {
        text: 'API اختصاصی Anthropic برای مدل‌های Claude (مناسب SDK رسمی و Claude Code):',
        code: `POST ${base()}/messages`,
      },
      {
        text: 'خطاها: 401 کلید نامعتبر، 402 موجودی ناکافی یا رسیدن به سقف هزینهٔ کلید، 403 مدل خارج از دسترسی کلید، 404 مدل ناموجود، و خطاهای ارائه‌دهنده با همان کد بازگردانده می‌شوند.',
      },
    ],
  },
];

export const guideBySlug = (slug: string) => guides.find((guide) => guide.slug === slug);
