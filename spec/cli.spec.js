// replacer-util
// CLI Specification Suite

// Imports
import { assertDeepStrictEqual, fileToLines } from 'assert-deep-strict-equal';
import { cliArgvUtil } from 'cli-argv-util';
import fs from 'node:fs';

// Setup
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const run = (posix) => cliArgvUtil.run(pkg, posix);

////////////////////////////////////////////////////////////////////////////////
describe('Executing the CLI', () => {

   it('with basic parameters creates the expected new menu file', () => {
      run('replacer spec/fixtures/menu.txt spec/target --find=Meatloaf --replacement=Bulgogi');
      const lines =    fileToLines('spec/target/menu.txt');
      const actual =   { lines: lines.length, first: lines[0] };
      const expected = { lines: 6,            first: '*** MENU ***' };
      assertDeepStrictEqual(actual, expected);
      });

   it('with the --non-recursive flag skips all subfolders', () => {
      run('replacer spec/fixtures/web --ext=.js --non-recursive spec/target/non-recursive');
      const files =    cliArgvUtil.readFolder('spec/target/non-recursive');
      const lines =    fileToLines('spec/target/non-recursive/mock1.js');
      const actual =   { files: files,        lines: lines.length, first: lines[0] };
      const expected = { files: ['mock1.js'], lines: 15,           first: '//! replacer-util ~~ MIT License' };
      assertDeepStrictEqual(actual, expected);
      });

   it('to concatenate file metadata generates the correct list of file parts', () => {
      const fileParts = ['folder', 'base', 'name', 'ext', 'dir', 'path'];
      const template =  fileParts.map(part => `${part}-{{gt}}{{file.${part}}}`).join('{{space}}');
      run(`replacer spec/fixtures/web spec/target --content=${template} --concat=file-parts.txt`);
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
      const lines =    fileToLines('spec/target/bundle.js');
      const actual =   { lines: lines.length, first: lines[0] };
      const expected = { lines: 37,           first: '//! 👾: mock1.js' };
      assertDeepStrictEqual(actual, expected);
      });

   it('with the --concat flag on a single file creates a bundle of one', () => {
      run('replacer spec/fixtures/web/subfolder-a --ext=.js spec/target --header=//{{bang}}\\ 👽:\\ {{file.base}} --concat=bundle-one.js');
      const lines =    fileToLines('spec/target/bundle-one.js');
      const actual =   { lines: lines.length, first: lines[0] };
      const expected = { lines: 20,           first: '//! 👽: mock2.js' };
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

   it('with the --content flag on binary files is able to access file metadata', () => {
      run('replacer spec/fixtures/web --ext=.html,.png,.jpg spec/target --content={{package.name}}{{pipe}}{{file.path}} --concat=binary-file-metadata.txt');
      const actual = fileToLines('spec/target/binary-file-metadata.txt');
      const expected = [
         'replacer-util|spec/fixtures/web/mock1.html',
         'replacer-util|spec/fixtures/web/mock1.png',
         'replacer-util|spec/fixtures/web/subfolder-a/mock2.html',
         'replacer-util|spec/fixtures/web/subfolder-a/mock2.jpg',
         'replacer-util|spec/fixtures/web/subfolder-b/mock3.html',
         'replacer-util|spec/fixtures/web/subfolder-b/subfolder-bb/mock4.html',
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

   it('with a regex macro does the correct replacement', () => {
      run('replacer spec/fixtures/menu.txt spec/target --rename=regex-macro.txt --regex={{macro:all-colons}} --replacement={{macro:arrow}}');
      const actual = fileToLines('spec/target/regex-macro.txt');
      const expected = [
         '*** MENU ***',
         'Monday -->    Meatloaf',
         'Tuesday -->   Tacos',
         'Wednesday --> Spaghetti',
         'Thursday -->  Meatloaf',
         'Friday -->    Teriyaki',
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
      const contents = fs.readFileSync('spec/target/virtual/robots.txt', 'utf-8').trim();
      const actual =   { contents: contents,        length: contents.length };
      const expected = { contents: '# Allow bots!', length: 13 };
      assertDeepStrictEqual(actual, expected);
      });

   it('can create a valid CNAME file', () => {
      run('replacer --cd=spec . target/virtual --virtual-input --content=example.com --rename=CNAME');
      const contents = fs.readFileSync('spec/target/virtual/CNAME', 'utf-8').trim();
      const actual =   { contents: contents,      length: contents.length };
      const expected = { contents: 'example.com', length: 11 };
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////
describe('Executing the CLI on no files', () => {

   it('creates an empty target folder', () => {
      run('replacer spec/fixtures/web --ext=.bogus spec/target/no-files');
      const actual =   cliArgvUtil.readFolder('spec/target/no-files');
      const expected = [];
      assertDeepStrictEqual(actual, expected);
      });

   });
