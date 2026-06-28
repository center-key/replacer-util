// replacer-util
// Package Specification Suite

// Imports
import { assertDeepStrictEqual } from 'assert-deep-strict-equal';
import fs from 'node:fs';

// Setup
import { replacer } from '../dist/replacer.js';

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

   const module = replacer;

   it('is exported as an object', () => {
      const actual =   { type: typeof module };
      const expected = { type: 'object' };
      assertDeepStrictEqual(actual, expected);
      });

   it('has the correct properties', () => {
      const actual = Object.keys(module).sort().map(key => [key, typeof module[key]]);
      const expected = [
         ['assertOk',  'function'],
         ['cli',       'function'],
         ['reporter',  'function'],
         ['transform', 'function'],
         ['version',   'string'],
         ];
      assertDeepStrictEqual(actual, expected);
      });

   });
