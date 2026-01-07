// replacer-util ~~ MIT License
//
// Usage in package.json:
//    "replacerConfig": {
//       "macros": {
//          "my-macro": "robots!"
//       }
//    }
//    "scripts": {
//       "build-web": "replacer src/web --ext=.html dist/website",
//       "poetry": "replacer poems dystopian-poems --find=humans --replacement={{macro:my-macro}}"
//    },
//
// Usage from command line:
//    $ npm install --save-dev replacer-util
//    $ npx replacer src/web --ext=.html docs --quiet
//    $ npx replacer src --ext=.js build --regex=/^let/gm --replacement=const
//
// Contributors to this project:
//    $ cd replacer-util
//    $ npm install
//    $ npm test
//    $ node bin/cli.js --cd=spec fixtures target --find=insect --replacement=A.I.{{space}}{{package.type}} --no-source-map --note=space
//    $ node bin/cli.js --cd=spec fixtures --ext=.js target --header=//{{bang}}\ 👾:\ {{file.base}} --concat=bundle.js

// Imports
import { cliArgvUtil } from 'cli-argv-util';
import { EOL } from 'node:os';
import { globSync } from 'glob';
import { isBinary } from 'istextorbinary';
import { Liquid } from 'liquidjs';
import chalk from 'chalk';
import fs    from 'fs';
import log   from 'fancy-log';
import path  from 'path';
import slash from 'slash';

// Types
export type Settings = {
   cd:           string | null,  //change working directory before starting search
   concat:       string | null,  //merge all files into one file in the target folder
   content:      string | null,  //string to be used instead of the input file contents
   exclude:      string | null,  //skip files containing the string in their path
   extensions:   string[],       //filter files by file extensions, example: ['.js', '.css']
   filename:     string | null,  //single file in the source folder to be processed
   find:         string | null,  //text to search for in the source input files
   header:       string | null,  //prepend a line of text to each file
   noSourceMap:  boolean,        //remove all "sourceMappingURL" comments directives
   regex:        RegExp | null,  //pattern to search for in the source input files
   rename:       string | null,  //new output filename
   replacement:  string | null,  //text to insert into the target output files
   templatingOn: boolean,        //enable LiquidJS templating
   titleSort:    boolean,        //ignore leading articles in --concat filenames
   virtualInput: boolean,        //do not read any files, use --content instead
   };
export type Results = {
   source:   string,  //path of origination folder
   target:   string,  //path of destination folder
   count:    number,  //number of files copied
   duration: number,  //execution time in milliseconds
   files:    { origin: string, dest: string }[],  //list of processed files
   };
export type ResultsFile = Results['files'][number];
export type ReporterSettings = {
   summaryOnly: boolean,  //only print out the single line summary message
   };
type Json = string | number | boolean | null | undefined | JsonObject | Json[];
type JsonObject = { [key: string]: Json };
type PageVars = { [name: string]: string };

const task = {

   cleanPath(folder: string): string {
      // Clean up path and remove trailing slash.
      // Example: 'data\books///123\' --> 'data/books/123'
      const string =        typeof folder === 'string' ? folder : '';
      const trailingSlash = /\/$/;
      return slash(path.normalize(string)).trim().replace(trailingSlash, '');
      },

   isTextFile(filename: string): boolean {
      // Returns true if the file is not a binary file such as a .png or .jpg file.
      return fs.statSync(filename).isFile() && !isBinary(filename);
      },

   readPackageJson() {
      // Returns package.json as an object literal.
      const pkgExists = fs.existsSync('package.json');
      const pkg = pkgExists ? <JsonObject>JSON.parse(fs.readFileSync('package.json', 'utf-8')) : null;
      const fixHiddenKeys = (pkgObj: JsonObject) => {
         const unhide = (key: string) => {
            const newKey = key.replace(/[@./]/g, '-');
            if (!pkgObj[newKey])
               pkgObj[newKey] = pkgObj[key]!;
            };
         Object.keys(pkgObj).forEach(unhide);
         };
      if (pkg?.dependencies)
         fixHiddenKeys(<JsonObject>pkg.dependencies);
      if (pkg?.devDependencies)
         fixHiddenKeys(<JsonObject>pkg.devDependencies);
      return pkg;
      },

   };

const replacer = {

   assert(ok: unknown, message: string | null) {
      if (!ok)
         throw new Error(`[replacer-util] ${message}`);
      },

   cli() {
      const validFlags = ['cd', 'concat', 'content', 'exclude', 'ext', 'find', 'header',
         'no-liquid', 'no-source-map', 'note', 'quiet', 'regex', 'rename', 'replacement',
         'summary', 'title-sort', 'virtual-input'];
      const cli =    cliArgvUtil.parse(validFlags);
      const source = cli.params[0];  //origin file or folder
      const target = cli.params[1];  //destination folder
      const pkg =    task.readPackageJson();
      const escapers: [RegExp, string][] = [
         [/{{apos}}/g,        "'"],
         [/{{bang}}/g,        '!'],
         [/{{close-curly}}/g, '}'],
         [/{{equals}}/g,      '='],
         [/{{gt}}/g,          '>'],
         [/{{hash}}/g,        '#'],
         [/{{lt}}/g,          '<'],
         [/{{open-curly}}/g,  '{'],
         [/{{pipe}}/g,        '|'],
         [/{{quote}}/g,       '"'],
         [/{{semi}}/g,        ';'],
         [/{{space}}/g,       ' '],
         ];
      const badRegex =       cli.flagOn.regex && !/^\/.*\/[a-z]*$/.test(cli.flagMap.regex!);
      const missingContent = cli.flagOn.virtualInput && !cli.flagMap.content;
      const missingRename =  cli.flagOn.virtualInput && !cli.flagMap.rename;
      const error =
         cli.invalidFlag ?    cli.invalidFlagMsg :
         !source ?            'Missing source folder.' :
         !target ?            'Missing target folder.' :
         badRegex ?           'Regex must be enclosed in slashes.' :
         missingContent ?     'Use the --content flag to set the source.' :
         missingRename ?      'Use the --rename flag to specify the output filename.' :
         cli.paramCount > 2 ? 'Extraneous parameter: ' + cli.params[2]! :
         null;
      replacer.assert(!error, error);
      const sourceFile =   path.join(cli.flagMap.cd ?? '', source!);
      const isFile =       fs.existsSync(sourceFile) && fs.statSync(sourceFile).isFile();
      const sourceFolder = isFile ? path.dirname(source!) : source;
      const regex =        cli.flagMap.regex?.substring(1, cli.flagMap.regex.lastIndexOf('/'));  //remove enclosing slashes
      const regexCodes =   cli.flagMap.regex?.replace(/.*\//, '');                               //grab the regex options
      const macros =       <JsonObject | undefined>(<JsonObject | undefined>pkg?.replacerConfig)?.macros;
      replacer.assert(!cli.flagOn.virtualInput || !isFile, 'Source must be a folder not a file.');
      const escapeChar = (param: string, escaper: typeof escapers[number]) =>
         param.replace(escaper[0], escaper[1]);
      const expandMacro = (param: string) => {
         // If param is a macro defined in package.json, return the macro's value.
         const macroName =  <keyof JsonObject>param.match(/^{{macro:(.*)}}$/)?.[1];
         const macroValue = <string>macros?.[macroName];
         const noMacro =    macroName && !macroValue;
         replacer.assert(!noMacro, `Macro "${macroName}" used but not defined in package.json`);
         return macroName ? macroValue : param;
         };
      const unescape = (param?: string) =>
         // Example: '{{hash}}{{space}}Allow{{space}}bots{{bang}}' --> '# Allow bots!'
         !param ? null : escapers.reduce(escapeChar, expandMacro(param));
      const options = {
         cd:           cli.flagMap.cd ?? null,
         concat:       cli.flagMap.concat ?? null,
         content:      unescape(cli.flagMap.content),
         exclude:      cli.flagMap.exclude ?? null,
         extensions:   cli.flagMap.ext?.split(',') ?? [],
         filename:     isFile ? path.basename(source!) : null,
         find:         unescape(cli.flagMap.find),
         header:       unescape(cli.flagMap.header),
         noSourceMap:  cli.flagOn.noSourceMap,
         regex:        cli.flagMap.regex ? new RegExp(unescape(regex)!, regexCodes) : null,
         rename:       cli.flagMap.rename ?? null,
         replacement:  unescape(cli.flagMap.replacement),
         templatingOn: !cli.flagOn.noLiquid,
         titleSort:    cli.flagOn.titleSort,
         virtualInput: cli.flagOn.virtualInput,
         };
      const results = replacer.transform(sourceFolder!, target!, options);
      if (!cli.flagOn.quiet)
         replacer.reporter(results, { summaryOnly: cli.flagOn.summary });
      },

   transform(sourceFolder: string, targetFolder: string, options?: Partial<Settings>): Results {
      const defaults: Settings = {
         cd:           null,
         concat:       null,
         content:      null,
         exclude:      null,
         extensions:   [],
         filename:     null,
         find:         null,
         header:       null,
         noSourceMap:  false,
         regex:        null,
         rename:       null,
         replacement:  null,
         templatingOn: true,
         titleSort:    false,
         virtualInput: false,
         };
      const settings =    { ...defaults, ...options };
      const startTime =   Date.now();
      const startFolder = settings.cd ? task.cleanPath(settings.cd) + '/' : '';
      const source =      task.cleanPath(startFolder + sourceFolder);
      const target =      task.cleanPath(startFolder + targetFolder);
      const concatFile =  settings.concat ? path.join(target, settings.concat) : null;
      const missingFind = !settings.find && !settings.regex && !!settings.replacement;
      const invalidSort = settings.titleSort && !settings.concat;
      if (targetFolder)
         fs.mkdirSync(target, { recursive: true });
      const error =
         !sourceFolder ?                      'Must specify the source folder path.' :
         !targetFolder ?                      'Must specify the target folder path.' :
         !fs.existsSync(source) ?             'Source folder does not exist: ' + source :
         !fs.existsSync(target) ?             'Target folder cannot be created: ' + target :
         !fs.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
         !fs.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
         missingFind ?                        'Must specify search text with --find or --regex' :
         invalidSort ?                        'Use of --titleSort requires --concat' :
         null;
      replacer.assert(!error, error);
      const getNewFilename = (file: string) => {
         const baseNameLoc =  () => file.length - path.basename(file).length;
         const relativePath = () => file.substring(source.length, baseNameLoc());
         const newFilename =  () => target + relativePath() + <string>settings.rename;
         return settings.rename ? newFilename() : null;
         };
      const outputFilename = (file: string) => target + '/' + file.substring(source.length + 1);
      const getFileRoute = (file: string) => ({
         origin: file,
         dest:   concatFile ?? getNewFilename(file) ?? outputFilename(file),
         });
      const titleCase = () => {
         const psuedo =         /\/index\.[a-z]*$/;
         const leadingArticle = /^(a|an|the)[- _]/;
         const toTitle = (filename: string) =>
            path.basename(filename.replace(psuedo, '')).toLowerCase().replace(leadingArticle, '');
         return (a: string, b: string) => toTitle(a).localeCompare(toTitle(b));
         };
      const readPaths =     (ext: string) => globSync(source + '/**/*' + ext).map(slash);
      const comparator =    settings.titleSort ? titleCase() : undefined;
      const getFiles =      () => exts.map(readPaths).flat().sort(comparator);
      const keep =          (file: string) => !settings.exclude || !file.includes(settings.exclude);
      const exts =          settings.extensions.length ? settings.extensions : [''];
      const filename =      settings.virtualInput ? '.' : settings.filename;
      const filesRaw =      filename ? [source + '/' + filename] : getFiles();
      const filtered =      filesRaw.filter(task.isTextFile).filter(keep);
      const files =         settings.virtualInput ? filesRaw : filtered;
      const fileRoutes =    files.map(file => slash(file)).map(getFileRoute);
      const pkg =           task.readPackageJson();
      const sourceMapLine = /^\/.#\ssourceMappingURL=.*\r?\n/gm;
      const header =        settings.header ? settings.header + EOL : '';
      const rep =           settings.replacement ?? '';
      const getFileInfo = (origin: string) => {
         const parsedPath = path.parse(origin);
         const dir =        slash(parsedPath.dir);
         const filePath =   dir + '/' + slash(parsedPath.base);
         const folder =     path.basename(dir);
         const date =       fs.statSync(origin).mtime;
         const dateFormat = { day: 'numeric', month: 'long', year: 'numeric' } as const;
         const modified =   date.toLocaleString([], dateFormat);  //ex: "April 7, 2030"
         const timestamp =  date.toISOString();                   //ex: "2030-04-07T07:01:36.037Z"
         return { ...parsedPath, dir, folder, path: filePath, date, modified, timestamp };
         };
      const getWebRoot = (origin: string) => {
         const depth = origin.substring(source.length).split('/').length - 2;
         return depth === 0 ? '.' : '..' + '/..'.repeat(depth - 1);
         };
      const createEngine = (file: ResultsFile) => {
         const globals = {
            package: pkg,
            file:    getFileInfo(file.origin),
            webRoot: getWebRoot(file.origin),
            };
         const engine = new Liquid({ globals });
         const versionFormatter = (numIds: number) =>
            (str: string): string => str.replace(/[^0-9]*/, '').split('.').slice(0, numIds).join('.');
         engine.registerFilter('version',       versionFormatter(3));
         engine.registerFilter('minor-version', versionFormatter(2));
         engine.registerFilter('major-version', versionFormatter(1));
         return engine;
         };
      const extractPageVars = (engine: Liquid, file: string): PageVars => {
         // Exammple:
         //    {% assign colorScheme = 'dark mode' %} ==> { colorScheme: 'dark mode' }
         type AssignTag = {  //warning: this type accesses unsupported private fields
            name:  string,
            key:   number,
            value: { initial: { postfix: { content: string }[] } },
            };
         const tags =     <AssignTag[]><object[]>engine.parseFileSync(file);
         const toPair =   (tag: AssignTag) => [tag.key, tag.value.initial.postfix[0]?.content];
         const tagPairs = tags.filter(tag => tag.name === 'assign').map(toPair);
         return <PageVars>Object.fromEntries(tagPairs);
         };
      const eofNewline = (text: string) => text.endsWith(EOL) ? text : text + EOL;
      const processFile = (file: ResultsFile, index: number) => {
         const engine =   createEngine(file);
         const needVars = settings.content && !settings.virtualInput;
         const pageVars = needVars ? extractPageVars(engine, file.origin) : {};
         const render =   (text: string) => <string>engine.parseAndRenderSync(text, pageVars);
         const append =   settings.concat && index > 0;
         const altText =  settings.content ? render(settings.content) : null;
         const text =     altText ?? fs.readFileSync(file.origin, 'utf-8');
         const content =  render(header) + text;
         const newStr =   render(rep);
         const out1 =     settings.templatingOn ? render(content) :                        content;
         const out2 =     settings.find ?         out1.replaceAll(settings.find, newStr) : out1;
         const out3 =     settings.regex ?        out2.replace(settings.regex, newStr) :   out2;
         const out4 =     settings.noSourceMap ?  out3.replace(sourceMapLine, '') :        out3;
         const out5 =     eofNewline(out4.trimStart());
         const final =    append && settings.header ? EOL + out5 : out5;
         fs.mkdirSync(path.dirname(file.dest), { recursive: true });
         return append ? fs.appendFileSync(file.dest, final) : fs.writeFileSync(file.dest, final);
         };
      fileRoutes.forEach(processFile);
      const relativePaths = (file: ResultsFile) => ({
         origin: file.origin.substring(source.length + 1),
         dest:   file.dest.substring(target.length + 1),
         });
      const results: Results = {
         source:   source,
         target:   target,
         count:    fileRoutes.length,
         duration: Date.now() - startTime,
         files:    fileRoutes.map(relativePaths),
         };
      return results;
      },

   reporter(results: Results, options?: Partial<ReporterSettings>): Results {
      // Pretty prints the output of the replacer.transform() function.
      const defaults: ReporterSettings = {
         summaryOnly: false,
         };
      const settings =  { ...defaults, ...options };
      const name =      chalk.gray('replacer');
      const indent =    chalk.gray('|');
      const ancestor =  cliArgvUtil.calcAncestor(results.source, results.target);
      const infoColor = results.count ? chalk.white : chalk.red.bold;
      const info =      infoColor(`(files: ${results.count}, ${results.duration}ms)`);
      log(name, ancestor.message, info);
      const logFile = (file: ResultsFile) =>
         log(name, indent, cliArgvUtil.calcAncestor(file.origin, file.dest).message);
      if (!settings.summaryOnly)
         results.files.forEach(logFile);
      return results;
      },

   };

export { replacer };
