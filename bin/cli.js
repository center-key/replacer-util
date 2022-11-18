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
//    $ node bin/cli.js --cd=spec/fixtures source target --pkg --find=insect --replacement=A.I.{{space}}{{pkg.type}} --no-source-map --note=space
//    $ node bin/cli.js --cd=spec/fixtures source --ext=.js target --header=//{{bang}}\ 👾:\ {{file.base}} --pkg --concat=bundle.js

// Imports
import { cliArgvUtil } from 'cli-argv-util';
import { replacer } from '../dist/replacer.js';
import chalk from 'chalk';
import fs    from 'fs';
import log   from 'fancy-log';
import path  from 'path';

// Parameters and flags
const validFlags = ['cd', 'concat', 'content', 'ext', 'find', 'header', 'no-source-map',
   'note', 'pkg', 'quiet', 'regex', 'rename', 'replacement', 'summary'];
const cli =        cliArgvUtil.parse(validFlags);
const source =     cli.params[0];  //origin file or folder
const target =     cli.params[1];  //destination folder

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
   if (!cli.flagOn.summary)
      results.files.forEach(logFile);
   };

// Escapers
const escapers = [
   [/{{bang}}/g,        '!'],
   [/{{close-curly}}/g, '}'],
   [/{{open-curly}}/g,  '{'],
   [/{{pipe}}/g,        '|'],
   [/{{quote}}/g,       '"'],
   [/{{semi}}/g,        ';'],
   [/{{space}}/g,       ' '],
   ];

// Transform Files
const badRegex = cli.flagOn.regex && !/^\/.*\/[a-z]*$/.test(cli.flagMap.regex);
const error =
   cli.invalidFlag ?     cli.invalidFlagMsg :
   !source ?             'Missing source folder.' :
   !target ?             'Missing target folder.' :
   badRegex ?            'Regex must be enclosed in slashes.' :
   cli.paramsCount > 2 ? 'Extraneous parameter: ' + cli.params[2] :
   null;
if (error)
   throw Error('[replacer-util] ' + error);
const sourceFile =   path.join(cli.flagMap.cd ?? '', source);
const isFile =       fs.existsSync(sourceFile) && fs.statSync(sourceFile).isFile();
const sourceFolder = isFile ? path.dirname(source) : source;
const regex =        cli.flagMap.regex?.substring(1, cli.flagMap.regex.lastIndexOf('/'));  //remove enclosing slashes
const regexCodes =   cli.flagMap.regex?.replace(/.*\//, '');                               //grab the regex options
const escapeChar =   (param, escaper) => param.replace(escaper[0], escaper[1]);
const escape =       (param) => !param ? null : escapers.reduce(escapeChar, param);
const options = {
   cd:          cli.flagMap.cd ?? null,
   concat:      cli.flagMap.concat ?? null,
   content:     escape(cli.flagMap.content),
   extensions:  cli.flagMap.ext?.split(',') ?? [],
   filename:    isFile ? path.basename(source) : null,
   find:        escape(cli.flagMap.find),
   header:      escape(cli.flagMap.header),
   noSourceMap: cli.flagOn.noSourceMap,
   regex:       cli.flagMap.regex ? new RegExp(escape(regex), regexCodes) : null,
   rename:      cli.flagMap.rename ?? null,
   replacement: escape(cli.flagMap.replacement),
   pkg:         cli.flagOn.pkg,
   };
const results = replacer.transform(sourceFolder, target, options);
if (!cli.flagOn.quiet)
   printReport(results);
