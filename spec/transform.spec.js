// replacer-util
// Function transform() Specification Suite

// Imports
import { assertDeepStrictEqual } from 'assert-deep-strict-equal';
import { cliArgvUtil } from 'cli-argv-util';

// Setup
import { replacer } from '../dist/replacer.js';

////////////////////////////////////////////////////////////////////////////////
describe('Calling replacer.transform()', () => {

   it('creates the correct text files in the target folder', () => {
      const options = {
         cd:          'spec',
         exclude:     'subfolder-b',
         find:        'insect',
         noSourceMap: true,
         replacement: 'A.I. {{package.type}}',  //'A.I. module'
         };
      replacer.transform('fixtures/web', 'target/exclude', options);
      const actual = cliArgvUtil.readFolder('spec/target/exclude');
      const expected = [
         'mock1.html',
         'mock1.js',
         'mock1.min.css',
         'subfolder-a',
         'subfolder-a/mock2.html',
         'subfolder-a/mock2.js',
         'subfolder-a/mock2.min.css',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   });
