// files-replace ~~ MIT License

import { isBinary } from 'istextorbinary';
import { Liquid } from 'liquidjs';
import fs    from 'fs';
import glob  from 'glob';
import path  from 'path';
import slash from 'slash';

export type Settings = {
   cd:          string,         //change working directory before starting copy
   extensions:  string[],       //filter files by file extensions, example: ['.js', '.css']
   find:        string | null,  //text to search for in the source input files
   replacement: string | null,  //text to insert into the target output files
   pkg:         false,          //load package.json and make it available as "pkg"
   };
export type Options = Partial<Settings>;
export type Results = {
   source:   string,  //path of origination folder
   target:   string,  //path of destination folder
   count:    number,  //number of files copied
   duration: number,  //execution time in milliseconds
   files:    { origin: string, dest: string }[],
   };
export type ResultsFile = Results['files'][0];

const util = {
   normalizeFolder(folderPath: string): string {
      return !folderPath ? '' : slash(path.normalize(folderPath)).replace(/\/$/, '');
      },
   isTextFile(filename: string): boolean {
      return fs.statSync(filename).isFile() && !isBinary(filename);
      },
   readPackageJson() {
      return JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      },
   };

const filesReplace = {
   transform(sourceFolder: string, targetFolder: string, options?: Options): Results {
      const defaults = {
         cd:             null,
         extensions: [],
         find:           null,
         replacement:    null,
         pkg: false,
         };
      const settings = { ...defaults, ...options };
      const startTime = Date.now();
      const startFolder = settings.cd ? util.normalizeFolder(settings.cd) + '/' : '';
      const source =      util.normalizeFolder(startFolder + sourceFolder);
      const target =      util.normalizeFolder(startFolder + targetFolder);
      const missingFind = !settings.find && !!settings.replacement;
      if (targetFolder)
         fs.mkdirSync(target, { recursive: true });
      const errorMessage =
         !sourceFolder ?                      'Must specify the source folder path.' :
         !targetFolder ?                      'Must specify the target folder path.' :
         !fs.existsSync(source) ?             'Source folder does not exist: ' + source :
         !fs.existsSync(target) ?             'Target folder cannot be created: ' + target :
         !fs.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
         !fs.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
         missingFind ?                        'Must specify search text with --find' :
         null;
      if (errorMessage)
         throw Error('[files-replace] ' + errorMessage);
      const resultsFile = (file: string) =>
         ({ origin: file, dest: target + '/' + file.substring(source.length + 1) });
      const extFiles = settings.extensions.map(ext => glob.sync(source + '/**/*' + ext)).flat().sort();
      const origins =  settings.extensions.length ? extFiles : glob.sync(source + '/**/*');
      const files =    origins.filter(util.isTextFile).map(file => slash(file)).map(resultsFile);
      const engine = new Liquid();
      const pkg = settings.pkg ? util.readPackageJson() : null;
      const processFile = (file: ResultsFile) => {
         const newStr =  settings.replacement ?? '';
         const text =    fs.readFileSync(file.origin, 'utf-8');
         const updated = settings.find ? text.replaceAll(settings.find, newStr) : text;
         const final =   settings.pkg ? engine.parseAndRenderSync(updated, { pkg }) : updated;
         fs.mkdirSync(path.dirname(file.dest), { recursive: true });
         fs.writeFileSync(file.dest, final);
         };
      files.map(processFile);
      const relativePaths = (file: ResultsFile) => ({
         origin: file.origin.substring(source.length + 1),
         dest:   file.dest.substring(target.length + 1),
         });
      return {
         source:   source,
         target:   target,
         count:    files.length,
         duration: Date.now() - startTime,
         files:    files.map(relativePaths),
         };
      },
   };

export { filesReplace };
