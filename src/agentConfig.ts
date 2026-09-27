import type { AgentConfig, ConfigField, ConfigValue } from './types';

/** A deep copy of a config; also works on Vue's reactive proxies (unlike structuredClone). */
export function cloneConfig(config: AgentConfig): AgentConfig {
  return JSON.parse(JSON.stringify(config)) as AgentConfig;
}

/** A fresh config with each field's default. */
export function defaultConfig(fields: ConfigField[]): AgentConfig {
  return cloneConfig(
    Object.fromEntries(fields.map((field) => [field.key, field.default ?? emptyValue(field)])),
  );
}

export function emptyValue(field: ConfigField): ConfigValue {
  if (['multiselect', 'tags', 'url_list'].includes(field.type)) return [];
  if (field.type === 'toggle') return false;
  return null;
}

function isBlank(value: ConfigValue | undefined): boolean {
  return (
    value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)
  );
}

/** Labels of required fields still empty (a saved secret counts as filled). */
export function missingFields(
  fields: ConfigField[],
  config: AgentConfig,
  secretsSet: string[] = [],
): string[] {
  return fields
    .filter((field) => field.required && field.type !== 'toggle')
    .filter((field) => !(field.type === 'secret' && secretsSet.includes(field.key)))
    .filter((field) => isBlank(config[field.key]))
    .map((field) => field.label);
}

/** Fields grouped by their form section, in the order they were defined. */
export function sections(fields: ConfigField[]): { title: string; fields: ConfigField[] }[] {
  const groups = new Map<string, ConfigField[]>();
  for (const field of fields) {
    const title = field.section ?? 'تنظیمات';
    groups.set(title, [...(groups.get(title) ?? []), field]);
  }
  return [...groups].map(([title, list]) => ({ title, fields: list }));
}
