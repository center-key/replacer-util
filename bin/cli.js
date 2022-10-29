#!/usr/bin/env node
///////////////////
// replacer-util //
// MIT License   //
///////////////////

// Usage in package.json:
//    "scripts": {
//       "build-web": "replacer src/web --ext=.html dist/website --pkg",
//       "poetry": "replacer poems dystopian-poems --find=humans --replacement=robots"
//    },
//
// Usage from command line:
//    $ npm install --global replacer-util
//    $ replacer src/web --ext=.html docs --pkg --quiet
//    $ replacer src --ext=.js build --regex=/^let/gm --replacement=const
//
// Contributors to this project:
//    $ cd replacer-util
//    $ npm install
//    $ npm test
//    $ node bin/cli.js --cd=spec/fixtures source target --pkg --find=insect --replacement=A.I.{{space}}{{pkg.type}} --note=space
//    $ node bin/cli.js --cd=spec/fixtures source --ext=.js target --header=//{{bang}}\ 👾:\ {{file.base}} --pkg --concat=bundle.js

// Imports
import { replacer } from '../dist/replacer.js';
import chalk from 'chalk';
import fs    from 'fs';
import log   from 'fancy-log';
import path  from 'path';

// Parameters
const validFlags =  ['cd', 'concat', 'content', 'ext', 'find', 'header', 'note', 'pkg', 'quiet', 'regex', 'rename', 'replacement', 'summary'];
const args =        process.argv.slice(2);
const flags =       args.filter(arg => /^--/.test(arg));
const flagMap =     Object.fromEntries(flags.map(flag => flag.replace(/^--/, '').split('=')));
const flagOn =      Object.fromEntries(validFlags.map(flag => [flag, flag in flagMap]));
const invalidFlag = Object.keys(flagMap).find(key => !validFlags.includes(key));
const params =      args.filter(arg => !/^--/.test(arg));

// Data
const source = params[0];  //origin file or folder
const target = params[1];  //destination folder

// Reporting
const printReport = (results) => {
   const name =      chalk.gray('replacer');
   const source =    chalk.blue.bold(results.source);
   const target =    chalk.magenta(results.target);
   const arrow =     { big: chalk.gray.bold('➤➤➤'), little: chalk.gray.bold(' ⟹  ') };  //extra space for alignment
   const infoColor = results.count ? chalk.white : chalk.red.bold;
   const info =      infoColor(`(files: ${results.count}, ${results.duration}ms)`);
   const logFile =   (file) => log(name, chalk.white(file.origin), arrow.little, chalk.green(file.dest));
   log(name, source, arrow.big, target, info);
   if (!flagOn.summary)
      results.files.forEach(logFile);
   };

// Transform Files
const badRegex = flagOn.regex && !/^\/.*\/[a-z]*$/.test(flagMap.regex);
const error =
   invalidFlag ?       'Invalid flag: ' + invalidFlag :
   !source ?           'Missing source folder.' :
   !target ?           'Missing target folder.' :
   badRegex ?          'Regex must be enclosed in slashes.' :
   params.length > 2 ? 'Extraneous parameter: ' + params[2] :
   null;
if (error)
   throw Error('[replacer-util] ' + error);
const sourceFile =   path.join(flagMap.cd ?? '', source);
const isFile =       fs.existsSync(sourceFile) && fs.statSync(sourceFile).isFile();
const sourceFolder = isFile ? path.dirname(source) : source;
const pattern =      flagMap.regex?.substring(1, flagMap.regex.lastIndexOf('/'));  //remove enclosing slashes
const patternCodes = flagMap.regex?.replace(/.*\//, '');                           //regex options
const escape = (param) =>
   param?.replace(/{{bang}}/g, '!').replace(/{{pipe}}/g, '|').replace(/{{space}}/g, ' ') ?? null;
const options = {
   cd:          flagMap.cd ?? null,
   concat:      flagMap.concat ?? null,
   content:     escape(flagMap.content),
   extensions:  flagMap.ext?.split(',') ?? [],
   filename:    isFile ? path.basename(source) : null,
   find:        escape(flagMap.find),
   header:      escape(flagMap.header),
   regex:       flagMap.regex ? new RegExp(escape(pattern), patternCodes) : null,
   rename:      flagMap.rename ?? null,
   replacement: escape(flagMap.replacement),
   pkg:         flagOn.pkg,
   };
const results = replacer.transform(sourceFolder, target, options);
if (!flagOn.quiet)
   printReport(results);
