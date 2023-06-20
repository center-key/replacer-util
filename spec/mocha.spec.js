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
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

////////////////////////////////////////////////////////////////////////////////
describe('The "dist" folder', () => {

   it('contains the correct files', () => {
      const actual = fs.readdirSync('dist').sort();
      const expected = [
         'replacer.d.ts',
         'replacer.js',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
describe('Calling replacer.transform()', () => {

   it('creates the correct text files in the target folder', () => {
      const options = {
         cd:          'spec/fixtures',
         pkg:         true,
         find:        'insect',
         noSourceMap: true,
         replacement: 'A.I. {{pkg.type}}',  //'A.I. module'
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

////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
describe('Executing the CLI', () => {
   const run = (posix) => {
      const name =    Object.keys(pkg.bin).sort()[0];
      const command = process.platform === 'win32' ? posix.replaceAll('\\ ', '" "') : posix;
      return execSync(command.replace(name, 'node bin/cli.js'), { stdio: 'inherit' });
      };

   it('with basic parameters creates the expected new menu file', () => {
      run('replacer spec/fixtures/menu.txt spec/fixtures/target --find=Meatloaf --replacement=Bulgogi');
      const actual =   ['menu.txt', fs.readdirSync('spec/fixtures/target')?.includes('menu.txt')];
      const expected = ['menu.txt', true];
      assertDeepStrictEqual(actual, expected);
      });

   it('with --header and --concat flags creates the expected bundle file', () => {
      run('replacer --cd=spec/fixtures source --ext=.js target --header=//{{bang}}\\ 👾:\\ {{file.base}} --pkg --concat=bundle.js');
      const actual =   ['bundle.js', fs.readdirSync('spec/fixtures/target')?.includes('bundle.js')];
      const expected = ['bundle.js', true];
      assertDeepStrictEqual(actual, expected);
      });

   });
