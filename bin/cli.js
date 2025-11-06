#!/usr/bin/env node
///////////////////
// replacer-util //
// MIT License   //
///////////////////

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
//    $ replacer src/web --ext=.html docs --quiet
//    $ replacer src --ext=.js build --regex=/^let/gm --replacement=const
//
// Contributors to this project:
//    $ cd replacer-util
//    $ npm install
//    $ npm test
//    $ node bin/cli.js --cd=spec/fixtures source target --find=insect --replacement=A.I.{{space}}{{package.type}} --no-source-map --note=space
//    $ node bin/cli.js --cd=spec/fixtures source --ext=.js target --header=//{{bang}}\ 👾:\ {{file.base}} --concat=bundle.js

import { replacer } from '../dist/replacer.js';

replacer.cli();
