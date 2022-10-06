// files-replace
// Mocha Specification Suite

// Imports
import { assertDeepStrictEqual } from 'assert-deep-strict-equal';
import assert from 'assert';
import fs from     'fs';

// Setup
import { filesReplace } from '../dist/files-replace.js';

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('The "dist" folder', () => {

   it('contains the correct files', () => {
      const actual = fs.readdirSync('dist').sort();
      const expected = [
         'files-replace.d.ts',
         'files-replace.js',
         'files-replace.umd.cjs',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('Library module', () => {

   it('is an object', () => {
      const actual =   { constructor: filesReplace.constructor.name };
      const expected = { constructor: 'Object' };
      assertDeepStrictEqual(actual, expected);
      });

   it('has a transform() function', () => {
      const actual =   { validate: typeof filesReplace.transform };
      const expected = { validate: 'function' };
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('Correct error is thrown', () => {

   it('when the "source" folder is missing', () => {
      const makeBogusCall = () => filesReplace.transform();
      const exception =     { message: '[files-replace] Must specify the source folder path.' };
      assert.throws(makeBogusCall, exception);
      });

   it('when the "target" folder is missing', () => {
      const makeBogusCall = () => filesReplace.transform('/source-folder');
      const exception =     { message: '[files-replace] Must specify the target folder path.' };
      assert.throws(makeBogusCall, exception);
      });

   });
