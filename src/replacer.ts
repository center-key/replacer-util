// replacer-util ~~ MIT License

// Imports
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
   titleSort:    boolean,        //ignore leading articles in "concat" filenames
   };
export type Results = {
   source:   string,  //path of origination folder
   target:   string,  //path of destination folder
   count:    number,  //number of files copied
   duration: number,  //execution time in milliseconds
   files:    { origin: string, dest: string }[],  //list of processed files
   };
export type ResultsFile = Results['files'][0];
export type ReporterSettings = {
   summaryOnly: boolean,  //only print out the single line summary message
   };
type PkgObj =   { [subkey: string]: string };
type Pkg =      { [key: string]: PkgObj };
type PageVars = { [name: string]: string };

const task = {
   normalizeFolder(folderPath: string): string {
      // Clean up path and remove trailing slash.
      // Example: 'data\books///123\' --> 'data/books/123'
      const string =        typeof folderPath === 'string' ? folderPath : '';
      const trailingSlash = /\/$/;
      return slash(path.normalize(string)).trim().replace(trailingSlash, '');
      },
   isTextFile(filename: string): boolean {
      // Returns true if the file is not a binary file such as a .png or .jpg file.
      return fs.statSync(filename).isFile() && !isBinary(filename);
      },
   readPackageJson(): Pkg {
      // Returns package.json as an object literal.
      const pkg = <Pkg>JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const fixHiddenKeys = (pkgObj: PkgObj) => {
         const unhide = (key: string) => {
            const newKey = key.replace(/[@./]/g, '-');
            if (!pkgObj[newKey])
               pkgObj[newKey] = pkgObj[key]!;
            };
         Object.keys(pkgObj).forEach(unhide);
         };
      if (pkg.dependencies)
         fixHiddenKeys(pkg.dependencies);
      if (pkg.devDependencies)
         fixHiddenKeys(pkg.devDependencies);
      return pkg;
      },
   };

const replacer = {

   transform(sourceFolder: string, targetFolder: string, options?: Partial<Settings>): Results {
      const defaults = {
         cd:           null,
         concat:       null,
         exclude:      null,
         extensions:   [],
         find:         null,
         noSourceMap:  false,
         regex:        null,
         replacement:  null,
         templatingOn: true,
         titleSort:    false,
         };
      const settings =    { ...defaults, ...options };
      const startTime =   Date.now();
      const startFolder = settings.cd ? task.normalizeFolder(settings.cd) + '/' : '';
      const source =      task.normalizeFolder(startFolder + sourceFolder);
      const target =      task.normalizeFolder(startFolder + targetFolder);
      const concatFile =  settings.concat ? path.join(target, settings.concat) : null;
      const missingFind = !settings.find && !settings.regex && !!settings.replacement;
      const invalidSort = settings.titleSort && !settings.concat;
      if (targetFolder)
         fs.mkdirSync(target, { recursive: true });
      const errorMessage =
         !sourceFolder ?                      'Must specify the source folder path.' :
         !targetFolder ?                      'Must specify the target folder path.' :
         !fs.existsSync(source) ?             'Source folder does not exist: ' + source :
         !fs.existsSync(target) ?             'Target folder cannot be created: ' + target :
         !fs.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
         !fs.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
         missingFind ?                        'Must specify search text with --find or --regex' :
         invalidSort ?                        'Use of --titleSort requires --concat' :
         null;
      if (errorMessage)
         throw new Error('[replacer-util] ' + errorMessage);
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
      const readPaths =     (ext: string) => globSync(source + '/**/*' + ext).map(slash);
      const toBase =        (filename: string) => path.basename(filename).toLocaleLowerCase();
      const toTitle =       (filename: string) => toBase(filename).replace(/^(a|an|the)[- _]/, '');
      const titleCase =     (a: string, b: string) => toTitle(a).localeCompare(toTitle(b));
      const comparator =    settings.titleSort ? titleCase : undefined;
      const getFiles =      () => exts.map(readPaths).flat().sort(comparator);
      const keep =          (file: string) => !settings.exclude || !file.includes(settings.exclude);
      const exts =          settings.extensions.length ? settings.extensions : [''];
      const filesRaw =      settings.filename ? [source + '/' + settings.filename] : getFiles();
      const filtered =      filesRaw.filter(task.isTextFile).filter(keep);
      const fileRoutes =    filtered.map(file => slash(file)).map(getFileRoute);
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
         }
      const eofNewline = (text: string) => text.endsWith(EOL) ? text : text + EOL;
      const processFile = (file: ResultsFile, index: number) => {
         const engine =   createEngine(file);
         const pageVars = settings.content ? extractPageVars(engine, file.origin) : {};
         const render =   (text: string) => <string>engine.parseAndRenderSync(text, pageVars);
         const append =   settings.concat && index > 0;
         const altText =  settings.content ? render(settings.content) : null;
         const text =     altText ?? fs.readFileSync(file.origin, 'utf-8');
         const content =  render(header) + text;
         const newStr =   render(rep);
         const out1 =     settings.templatingOn ? render(content) : content;
         const out2 =     settings.find ? out1.replaceAll(settings.find, newStr) : out1;
         const out3 =     settings.regex ? out2.replace(settings.regex, newStr) : out2;
         const out4 =     settings.noSourceMap ? out3.replace(sourceMapLine, '') : out3;
         const out5 =     eofNewline(out4.trimStart());
         const final =    append && settings.header ? EOL + out5 : out5;
         fs.mkdirSync(path.dirname(file.dest), { recursive: true });
         return append ? fs.appendFileSync(file.dest, final) : fs.writeFileSync(file.dest, final);
         };
      fileRoutes.map(processFile);
      const relativePaths = (file: ResultsFile) => ({
         origin: file.origin.substring(source.length + 1),
         dest:   file.dest.substring(target.length + 1),
         });
      return {
         source:   source,
         target:   target,
         count:    fileRoutes.length,
         duration: Date.now() - startTime,
         files:    fileRoutes.map(relativePaths),
         };
      },

   reporter(results: Results, options?: Partial<ReporterSettings>): Results {
      // Pretty prints the output of the replacer.transform() function.
      const defaults = {
         summaryOnly: false,
         };
      const settings =  { ...defaults, ...options };
      const name =      chalk.gray('replacer');
      const source =    chalk.blue.bold(results.source);
      const target =    chalk.magenta(results.target);
      const arrow =     { big: chalk.gray.bold(' ⟹  '), little: chalk.gray.bold('→') };
      const infoColor = results.count ? chalk.white : chalk.red.bold;
      const info =      infoColor(`(files: ${results.count}, ${results.duration}ms)`);
      log(name, source, arrow.big, target, info);
      const logFile = (file: ResultsFile) =>
         log(name, chalk.white(file.origin), arrow.little, chalk.green(file.dest));
      if (!settings.summaryOnly)
         results.files.forEach(logFile);
      return results;
      },

   };

export { replacer };
