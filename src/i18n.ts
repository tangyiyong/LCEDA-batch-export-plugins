import { dictionaries } from './locale-data.ts';
export const LANGUAGES={'zh-Hans':'简体中文','zh-Hant':'繁體中文',en:'English',fr:'Français',ja:'日本語',ko:'한국어'} as const;
export type Language=keyof typeof LANGUAGES;
let current:Language='zh-Hans';
export function resolveLanguage(value:string):Language {
  if(value in LANGUAGES)return value as Language;
  if(/^zh[-_](TW|HK|MO|Hant)/i.test(value))return 'zh-Hant';
  if(/^zh/i.test(value))return 'zh-Hans';
  const base=value.split(/[-_]/)[0].toLowerCase();return base in LANGUAGES?base as Language:'en';
}
export function setLanguage(value:string):Language {return current=resolveLanguage(value);}
export function getLanguage():Language{return current;}
// Arguments are substituted once: user names and JSON values remain untouched.
export function t(key:string,...args:unknown[]):string {
  const value=dictionaries[current][key]||dictionaries.en[key]||key;
  return value.replace(/\$\{(\d+)\}/g,(token,i)=>Number(i)<=args.length?String(args[Number(i)-1]):token);
}
export function translateStatic(root:HTMLElement):void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n!));
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach(node=>node.setAttribute('placeholder',t(node.dataset.i18nPlaceholder!)));
  root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.i18nLabel!)));
  document.documentElement.lang=current;document.title=t('多子板一键导出');
  document.documentElement.style.setProperty('--options-label',JSON.stringify(t('配置 ▾')));
}
