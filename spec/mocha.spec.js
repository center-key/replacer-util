// replacer-util
// Mocha Specification Suite

// Imports
import { assertDeepStrictEqual } from 'assert-deep-strict-equal';
import { cliArgvUtil } from 'cli-argv-util';
import assert from 'assert';
import fs     from 'fs';

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

   it('has functions named transform() and reporter()', () => {
      const module = replacer;
      const actual = Object.keys(module).sort().map(key => [key, typeof module[key]]);
      const expected = [
         ['reporter',  'function'],
         ['transform', 'function'],
         ];
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////
describe('Calling replacer.transform()', () => {

   it('creates the correct text files in the target folder', () => {
      const options = {
         cd:          'spec/fixtures',
         exclude:     'subfolder-b',
         find:        'insect',
         noSourceMap: true,
         pkg:         true,
         replacement: 'A.I. {{pkg.type}}',  //'A.I. module'
         };
      replacer.transform('source', 'target', options);
      const actual = cliArgvUtil.readFolder('spec/fixtures/target');
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
   const run = (posix) => cliArgvUtil.run(pkg, posix);

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

   it('on HTML files to create index.html files preserves the folder structure', () => {
      run('replacer spec/fixtures/source --ext=.html --pkg --rename=index.html spec/fixtures/target/web');
      const actual = cliArgvUtil.readFolder('spec/fixtures/target/web');
      const expected = [
         'index.html',
         'subfolder-a',
         'subfolder-a/index.html',
         'subfolder-b',
         'subfolder-b/index.html',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   });
