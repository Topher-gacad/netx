import type { Curriculum } from '../types.js';
import { module01 } from './module-01.js';
import { module02 } from './module-02.js';
import { module03 } from './module-03.js';
import { module04 } from './module-04.js';
import { module05 } from './module-05.js';
import { module06 } from './module-06.js';
import { module07 } from './module-07.js';
import { module08 } from './module-08.js';
import { module09 } from './module-09.js';
import { module10 } from './module-10.js';

export const curriculum: Curriculum = {
  id: 'netx-lessons-v1',
  title: 'NetX Networking Lessons',
  modules: [
    module01,
    module02,
    module03,
    module04,
    module05,
    module06,
    module07,
    module08,
    module09,
    module10,
  ],
};
