// replacer-util
// Mocha Specification Suite

// Imports
import { assertDeepStrictEqual, fileToLines } from 'assert-deep-strict-equal';
import { cliArgvUtil } from 'cli-argv-util';
import { EOL } from 'node:os';
import assert from 'assert';
import fs     from 'fs';

// Setup
import { replacer } from '../dist/replacer.js';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const run = (posix) => cliArgvUtil.run(pkg, posix);

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

   it('has functions named assert(), cli(), reporter(), and transform()', () => {
      const module = replacer;
      const actual = Object.keys(module).sort().map(key => [key, typeof module[key]]);
      const expected = [
         ['assert',    'function'],
         ['cli',       'function'],
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

////////////////////////////////////////////////////////////////////////////////
describe('Correct error is thrown', () => {

   it('when the "source" folder is missing', () => {
      const makeBogusCall = () => replacer.transform();
      const exception =     { message: '[replacer-util] Must specify the source folder path.' };
      assert.throws(makeBogusCall, exception);
      });

   it('when the "target" folder is missing', () => {
      const makeBogusCall = () => replacer.transform('spec/fixtures');
      const exception =     { message: '[replacer-util] Must specify the target folder path.' };
      assert.throws(makeBogusCall, exception);
      });

   });

////////////////////////////////////////////////////////////////////////////////
describe('Executing the CLI', () => {

   it('with basic parameters creates the expected new menu file', () => {
      run('replacer spec/fixtures/menu.txt spec/target --find=Meatloaf --replacement=Bulgogi');
      const actual =   ['menu.txt', fs.readdirSync('spec/target')?.includes('menu.txt')];
      const expected = ['menu.txt', true];
      assertDeepStrictEqual(actual, expected);
      });

   it('to concatenate file metadata generates the correct list of file parts', () => {
      const fileParts = ['folder', 'base', 'name', 'ext', 'dir', 'path'];
      const template =  fileParts.map(part => `${part}-{{gt}}{{file.${part}}}`).join('{{space}}');
      run('replacer spec/fixtures/web spec/target --content=' + template + ' --concat=file-parts.txt');
      const actual = fileToLines('spec/target/file-parts.txt');
      const expected = [
         'folder->web base->mock1.html name->mock1 ext->.html dir->spec/fixtures/web path->spec/fixtures/web/mock1.html',
         'folder->web base->mock1.js name->mock1 ext->.js dir->spec/fixtures/web path->spec/fixtures/web/mock1.js',
         'folder->web base->mock1.min.css name->mock1.min ext->.css dir->spec/fixtures/web path->spec/fixtures/web/mock1.min.css',
         'folder->subfolder-a base->mock2.html name->mock2 ext->.html dir->spec/fixtures/web/subfolder-a path->spec/fixtures/web/subfolder-a/mock2.html',
         'folder->subfolder-a base->mock2.js name->mock2 ext->.js dir->spec/fixtures/web/subfolder-a path->spec/fixtures/web/subfolder-a/mock2.js',
         'folder->subfolder-a base->mock2.min.css name->mock2.min ext->.css dir->spec/fixtures/web/subfolder-a path->spec/fixtures/web/subfolder-a/mock2.min.css',
         'folder->subfolder-b base->mock3.html name->mock3 ext->.html dir->spec/fixtures/web/subfolder-b path->spec/fixtures/web/subfolder-b/mock3.html',
         'folder->subfolder-bb base->mock4.html name->mock4 ext->.html dir->spec/fixtures/web/subfolder-b/subfolder-bb path->spec/fixtures/web/subfolder-b/subfolder-bb/mock4.html',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   it('with --header and --concat flags creates the expected bundle file', () => {
      run('replacer --cd=spec fixtures/web --ext=.js target --header=//{{bang}}\\ 👾:\\ {{file.base}} --concat=bundle.js');
      const actual =   ['bundle.js', fs.readdirSync('spec/target')?.includes('bundle.js')];
      const expected = ['bundle.js', true];
      assertDeepStrictEqual(actual, expected);
      });

   it('on HTML files to create index.html files preserves the folder structure', () => {
      run('replacer spec/fixtures/web --ext=.html --rename=index.html spec/target/web');
      const actual = cliArgvUtil.readFolder('spec/target/web');
      const expected = [
         'index.html',
         'subfolder-a',
         'subfolder-a/index.html',
         'subfolder-b',
         'subfolder-b/index.html',
         'subfolder-b/subfolder-bb',
         'subfolder-b/subfolder-bb/index.html',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   it('with the --content flag is able to access page variables in the source files', () => {
      run('replacer spec/fixtures/web --ext=.html spec/target --content={{file.name}}:{{space}}{{slogan}} --concat=page-variables.txt');
      const actual = fileToLines('spec/target/page-variables.txt');
      const expected = [
         'mock1: I, for one, welcome our new insect overlords.',
         'mock2: I, for one, welcome our new insect overlords.',
         'mock3: I, for one, welcome our new insect overlords.',
         'mock4: I, for one, welcome our new insect overlords.',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   it('with a macro generates the same result', () => {
      run('replacer spec/fixtures/web --ext=.html spec/target --content={{macro:slogan-line}} --concat=page-variables-macro.txt');
      const actual = fileToLines('spec/target/page-variables-macro.txt');
      const expected = [
         'mock1: I, for one, welcome our new insect overlords.',
         'mock2: I, for one, welcome our new insect overlords.',
         'mock3: I, for one, welcome our new insect overlords.',
         'mock4: I, for one, welcome our new insect overlords.',
         ];
      assertDeepStrictEqual(actual, expected);
      });

   it('with both the --concat and --title-sort flags sorts content by title', () => {
      run('replacer spec/fixtures/titles spec/target --concat=sort-by-filename.txt');
      run('replacer spec/fixtures/titles spec/target --concat=sort-by-title.txt --title-sort');
      const actual = {
         filename: fileToLines('spec/target/sort-by-filename.txt'),
         title:    fileToLines('spec/target/sort-by-title.txt'),
         };
      const expected = {
         filename: [
            'A Tiny Guide to BBQ',
            'An Awesome BLT',
            'Green Eggs and Ham',
            'The Bacon Cookbook',
            ],
         title: [
            'An Awesome BLT',       //ignore leading "An"
            'The Bacon Cookbook',   //ignore leading "The"
            'Green Eggs and Ham',
            'A Tiny Guide to BBQ',  //ignore leading "A"
            ],
         };
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////
describe('Executing the CLI with the --virtual-input flag', () => {

   it('can create a valid Robots Exclusion Protocol file', () => {
      run('replacer spec spec/target/virtual --virtual-input --content={{hash}}{{space}}Allow{{space}}bots{{bang}} --rename=robots.txt');
      const contents = fs.readFileSync('spec/target/virtual/robots.txt', 'utf-8');
      const actual =   { contents: contents,              length: contents.length };
      const expected = { contents: '# Allow bots!' + EOL, length: 14 };
      assertDeepStrictEqual(actual, expected);
      });

   it('can create a valid CNAME file', () => {
      run('replacer --cd=spec . target/virtual --virtual-input --content=example.com --rename=CNAME');
      const contents = fs.readFileSync('spec/target/virtual/CNAME', 'utf-8');
      const actual =   { contents: contents,            length: contents.length };
      const expected = { contents: 'example.com' + EOL, length: 12 };
      assertDeepStrictEqual(actual, expected);
      });

   });
