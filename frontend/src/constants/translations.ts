import { Lang } from '../types/election';
import { en } from '../locales/en';
import { np } from '../locales/np';
import { jp } from '../locales/jp';
import type { Locale } from '../locales/types';

export const getTranslations = (lang: Lang): Locale => {
  switch (lang) {
    case Lang.EN:
      return en;
    case Lang.JP:
      return jp;
    case Lang.NP:
    default:
      return np;
  }
};
