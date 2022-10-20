// replacer-util
// Mocha Specification Suite

// Imports
import { assertDeepStrictEqual } from 'assert-deep-strict-equal';
import { execSync } from 'node:child_process';
import { revWebAssets } from 'rev-web-assets';
import assert from 'assert';
import fs from     'fs';

// Setup
import { replacer } from '../dist/replacer.js';

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('The "dist" folder', () => {

   it('contains the correct files', () => {
      const actual = fs.readdirSync('dist').sort();
      const expected = [
         'replacer.d.ts',
         'replacer.js',
         'replacer.umd.cjs',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('Library module', () => {

   it('is an object', () => {
      const actual =   { constructor: replacer.constructor.name };
      const expected = { constructor: 'Object' };
      assertDeepStrictEqual(actual, expected);
      });

   it('has a transform() function', () => {
      const actual =   { validate: typeof replacer.transform };
      const expected = { validate: 'function' };
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('Calling replacer.transform()', () => {

   it('creates the correct text files in the target folder', () => {
      const options = {
         cd:          'spec/fixtures',
         pkg:         true,
         find:        'insect',
         replacement: 'A.I.',
         };
      replacer.transform('source', 'target', options);
      const actual = revWebAssets.readFolderRecursive('spec/fixtures/target');
      const expected = [
         'spec/fixtures/target/mock1.html',
         'spec/fixtures/target/mock1.js',
         'spec/fixtures/target/mock1.min.css',
         'spec/fixtures/target/subfolder/mock2.html',
         'spec/fixtures/target/subfolder/mock2.js',
         'spec/fixtures/target/subfolder/mock2.min.css',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('Correct error is thrown', () => {

   it('when the "source" folder is missing', () => {
      const makeBogusCall = () => replacer.transform();
      const exception =     { message: '[replacer-util] Must specify the source folder path.' };
      assert.throws(makeBogusCall, exception);
      });

   it('when the "target" folder is missing', () => {
      const makeBogusCall = () => replacer.transform('/source-folder');
      const exception =     { message: '[replacer-util] Must specify the target folder path.' };
      assert.throws(makeBogusCall, exception);
      });

   });

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('Executing the CLI', () => {

   it('with --header and --concat flags creates the expected bundle file', () => {
      const cmd = 'node bin/cli.js --cd=spec/fixtures source --ext=.js target --header="//! JavaScript: {{file.base}}" --pkg --concat=bundle.js';
      execSync(cmd);
      const actual =   { bundle: fs.readdirSync('spec/fixtures/target')?.[0] };
      const expected = { bundle: 'bundle.js' };
      assertDeepStrictEqual(actual, expected);
      });

   });
