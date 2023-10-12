# replacer-util
<img src=https://centerkey.com/graphics/center-key-logo.svg align=right width=200 alt=logo>

_Find and replace strings, regex patterns, or template outputs in text files (CLI tool designed for use in npm scripts)_

[![License:MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/center-key/replacer-util/blob/main/LICENSE.txt)
[![npm](https://img.shields.io/npm/v/replacer-util.svg)](https://www.npmjs.com/package/replacer-util)
[![Build](https://github.com/center-key/replacer-util/workflows/build/badge.svg)](https://github.com/center-key/replacer-util/actions/workflows/run-spec-on-push.yaml)

**replacer-util** searches for text to substitute with a replacement string or with values from your project's **package.json** file, such as the project version number.&nbsp;
**LiquidJS** powers the template outputs and enables **replacer-util** to act as a static site generator complete with filter formatters and `render` tags for including partials.&nbsp;

<img src=https://raw.githubusercontent.com/center-key/replacer-util/main/screenshot.png
width=800 alt=screenshot>

## A) Setup
Install package for node:
```shell
$ npm install --save-dev replacer-util
```

## B) Usage
### 1. npm scripts
Run `replacer` from the `"scripts"` section of your **package.json** file.

Parameters:
* The **first** parameter is the *source* folder or file.
* The **second** parameter is the *target* folder.

Example **package.json** scripts:
```json
   "scripts": {
      "build-web": "replacer src/web --ext=.html dist/website",
      "poetry": "replacer poems --find=human --replacement=robot dystopian-poems"
   },
```
In addition to the `--find` and `--replacement` CLI flags, template outputs in the source files will be replaced with their corresponding template variable values.&nbsp;
The template variable `package` points to the **package.json** object, enabling `{{package.version}}` in the source file to be replaced with the project's version number.

### 2. Command-line npx
Example terminal commands:
```shell
$ npm install --save-dev replacer-util
$ npx replacer src/web ext=.html docs/api-manual
```
You can also install **replacer-util** globally (`--global`) and then run it anywhere directly from the terminal.

### 3. CLI flags
Command-line flags:
| Flag              | Description                                           | Value      |
| ----------------- | ----------------------------------------------------- | ---------- |
| `--cd`            | Change working directory before starting search.      | **string** |
| `--concat`        | Merge all files into one file in the target folder.   | **string** |
| `--content`       | String to be used instead of the input file contents. | **string** |
| `--exclude`       | Skip files containing the string in their path.       | **string** |
| `--ext`           | Filter files by file extension, such as `.js`.<br>Use a comma to specify multiple extensions. | **string** |
| `--find`          | Text to search for in the source input files.         | **string** |
| `--header`        | Prepend a line of text to each file.                  | **string** |
| `--no-liquid`     | Turn off LiquidJS templating.                         | N/A        |
| `--no-source-map` | Remove any `sourceMappingURL` comment directives.     | N/A        |
| `--note`          | Place to add a comment only for humans.               | **string** |
| `--quiet`         | Suppress informational messages.                      | N/A        |
| `--regex`         | Pattern to search for in the source input files.      | **string** |
| `--rename`        | New output filename.                                  | **string** |
| `--replacement`   | Text to insert into the target output files.          | **string** |
| `--summary`       | Only print out the single line summary message.       | N/A        |

To avoid issues on the command line, problematic characters can be _"escaped"_ with safe strings as listed below.

Escape characters:
| Character | Safe stand-in string |
| --------- | -------------------- |
| `'`       | `{{apos}}`           |
| `!`       | `{{bang}}`           |
| `}`       | `{{close-curly}}`    |
| `=`       | `{{equals}}`         |
| `>`       | `{{gt}}`             |
| `<`       | `{{lt}}`             |
| `{`       | `{{open-curly}}`     |
| `\|`      | `{{pipe}}`           |
| `"`       | `{{quote}}`          |
| `;`       | `{{semi}}`           |
| ` `       | `{{space}}`          |

### 4. Example CLI usage
Examples:
   - `replacer src build`<br>
   Recursively copies all the files in the **src** folder to the **build** folder using the data in **package.json** to update the template outputs.

   - `replacer src/docs --ext=.md --find=Referer --replacement=Referrer output/fixed`<br>
   Fixes spelling error in markdown files.

   - `replacer src/docs --ext=.md --find=Referer --replacement=Referrer --no-liquid output/fixed`<br>
   Same as previous example but disables LiquidJS templating (useful in case source files contain characters inadvertently interpreted at templating commands).

   - `replacer web '--find=cat dog' '--replacement= cat{{pipe}}dog ' target`<br>
   `replacer web --find=cat\ dog --replacement=\ cat{{pipe}}dog\  target`<br>
   `replacer web --find=cat{{space}}dog --replacement={{space}}cat{{pipe}}dog{{space}} target`<br>
   Replaces all occurances of the string `'cat dog'` with `' cat|dog '` (note the _3 different_ ways to _"escape"_ a space character).

   - `replacer src --ext=.js --no-liquid --concat=bundle.js build`<br>
   Merges all JS files into **build/bundle.js**.

   - `replacer app/widgets --ext=.less --content=@import{{space}}{{quote}}{{file.dir}}/{{file.name}}{{quote}}{{semi}} --concat=widgets.less app/style`<br>
   Creates a single LESS file that imports the LESS files of every widget component.

   - `replacer src --summary build`<br>
   Displays the summary but not the individual files copied.

   - `replacer src --regex=/^--/gm --replacement=🥕🥕🥕 build`<br>
   Finds double dashes at the start of lines and replace them with 3 carrots.&nbsp;
   Note the `gm` [regex options](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#advanced_searching_with_flags).

   - `replacer build/my-app.js --rename=my-app.browser.js build`<br>
   Copies **my-app.js** to **my-app.browser.js** without making and changes.

   - `replacer src/web --ext=.html --rename=index.html dist/website`<br>
   Renames all HTML files, such as **src/web/about/about.html**, to **index.html** while preserving the folder structure.

   - `replacer --cd=spec/fixtures source --find=insect --replacement=A.I. target`<br>
   Removes all insects.  See: [source/mock1.html](spec/fixtures/source/mock1.html) and [target/mock1.html](spec/fixtures/target/mock1.html)

   - `replacer node_modules/chart.js/dist/chart.umd.js --no-source-map build/1-pre/libs`<br>
   Removes the `//# sourceMappingURL=chart.umd.js.map` line at the bottom of the **Chart.js** distribution file.

_**Note:** Single quotes in commands are normalized so they work cross-platform and avoid the errors often encountered on Microsoft Windows._

### 5. Template outputs and filter formatters
The source files are processed by LiquidJS, so you can use [template outputs](https://liquidjs.com/tutorials/intro-to-liquid.html#Outputs) and [filter formatters](https://liquidjs.com/filters/overview.html).&nbsp;
Custom variables are created with the [assign](ttps://liquidjs.com/tags/assign.html) tag.

Three special variables are available by default:
   * `file`    ([path information](https://nodejs.org/api/path.html#pathparsepath) about the target file)
   * `package` (values from your project's **package.json** file)
   * `webRoot` (relative path to root folder: `.`, `..`, `../..`, `../../..`, etc.)

For example, a TypeScript file with the lines:
```typescript
const msg1: string = 'The current release of {{package.name | upcase}} is v{{package.version}}.';
const msg2: string = 'This file is: {{file.base}}';
```
will be transformed into something like:
```typescript
const msg1: string = 'The current release of MY-COOL-NPM-PACKAGE is v1.2.3.';
const msg2: string = 'This file is: my-app.ts';
```

Example outputs and formatters:
| Source file text                | Example output value      | Note                                           |
| ------------------------------- | ------------------------- | ---------------------------------------------- |
| `{{package.name}}`              | `my-project`              | Value from `name` field in **package.json**    |
| `{{package.version}}`           | `3.1.4`                   | Value from `version` field in **package.json** |
| `{{package.version \| size}}`   | `5`                       | Length of the version number string            |
| `{{file.name}}`                 | `password-reset`          | Source filename without the file extension     |
| `{{file.path}}`                 | `web/password-reset.html` | Full path to source file                       |
| `<a href={{webRoot}}>Home</a>`  | `<a href=../..>Home</a>`  | Link is relative to the source folder          |
| `{{"now" \| date: "%Y-%m-%d"}}` | `2023-09-28`              | Build date timestamp                           |
| `{{myVariable \| upcase}}`      | `DARK MODE`               | Custom variable set with: `{% assign myVariable = 'dark mode' %}` |

_**Note:** Use the `--no-liquid` flag if characters in your source files are inadvertently being interpreted as templating commands and causing errors._

### 6. SemVer
Your project's dependancies declared in **package.json** can be used to automatically keep your
CDN links up-to-date.

Three special filter formatters are available to support Semantic Versioning (SemVer):
   * `version`
   * `major-version`
   * `minor-version`

For example, if your project declares a dependency of `^3.1.4` for **fetch-json**, the line:
```html
<script src=https://cdn.jsdelivr.net/npm/fetch-json@{{package.dependencies.fetch-json|minor-version}}/dist/fetch-json.min.js></script>
```
will be transformed into:
```html
<script src=https://cdn.jsdelivr.net/npm/fetch-json@3.1/dist/fetch-json.min.js></script>
```
_**Note:** Some package names contain one or more of the characters `@`, `/`, and `.`, and these 3
characters are not supported for replacement.&nbsp; Use `-` in the package name instead._

For example, CDN links for the packages `"@fortawesome/fontawesome-free"` and `"highlight.js"` can be created with:
```html
<link rel=stylesheet href=https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@{{package.devDependencies.-fortawesome-fontawesome-free|version}}/css/all.min.css>
<script src=https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@{{package.devDependencies.highlight-js|version}}/build/highlight.min.js></script>
```

## C) Application Code
Even though **replacer-util** is primarily intended for build scripts, the package can be used programmatically in ESM and TypeScript projects.

Example:
``` typescript
import { replacer } from 'replacer-util';

const options = { extensions: ['.html', '.js'] };
const results = replacer.transform('src/web', 'docs/api-manual', options);
console.log('Number of files copied:', results.count);
```

See the **TypeScript Declarations** at the top of [replacer.ts](replacer.ts) for documentation.

<br>

---
**CLI Build Tools for package.json**
   - 🎋 [add-dist-header](https://github.com/center-key/add-dist-header):&nbsp; _Prepend a one-line banner comment (with license notice) to distribution files_
   - 📄 [copy-file-util](https://github.com/center-key/copy-file-util):&nbsp; _Copy or rename a file with optional package version number_
   - 📂 [copy-folder-util](https://github.com/center-key/copy-folder-util):&nbsp; _Recursively copy files from one folder to another folder_
   - 🪺 [recursive-exec](https://github.com/center-key/recursive-exec):&nbsp; _Run a command on each file in a folder and its subfolders_
   - 🔍 [replacer-util](https://github.com/center-key/replacer-util):&nbsp; _Find and replace strings or template outputs in text files_
   - 🔢 [rev-web-assets](https://github.com/center-key/rev-web-assets):&nbsp; _Revision web asset filenames with cache busting content hash fingerprints_
   - 🚆 [run-scripts-util](https://github.com/center-key/run-scripts-util):&nbsp; _Organize npm scripts into named groups of easy to manage commands_
   - 🚦 [w3c-html-validator](https://github.com/center-key/w3c-html-validator):&nbsp; _Check the markup validity of HTML files using the W3C validator_

Feel free to submit questions at:<br>
[github.com/center-key/replacer-util/issues](https://github.com/center-key/replacer-util/issues)

[MIT License](LICENSE.txt)
