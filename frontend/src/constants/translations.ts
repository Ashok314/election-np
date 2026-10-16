import { Lang } from '../types/election';
import { en } from '../locales/en';
import { np } from '../locales/np';
import { jp } from '../locales/jp';
import type { Locale } from '../locales/types';
import type { ElectionConfig } from '../config/election';

export const getTranslations = (lang: Lang, election: ElectionConfig): Locale => {
  switch (lang) {
    case Lang.EN:
      return en(election);
    case Lang.JP:
      return jp(election);
    case Lang.NP:
    default:
      return np(election);
  }
};
