import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { TT, loadI18NResource } from '@nuogz/i18n';



loadI18NResource('@nuogz/wock-client', resolve(dirname(fileURLToPath(import.meta.url)), '..', 'locale'));


export const T = TT('@nuogz/wock-client');
