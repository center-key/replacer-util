//! replacer-util ~~ MIT License
// File: mock1.js

let π1 = 3.14;
let τ1 = 2 * π1;

const info1 = {
   banner:      '🔍🔍🔍 {{package.name}} v{{package.version}} 🔍🔍🔍',
   description: '{{package.description}}',
   list1:       'insect, insect, insect',
   list2:       'insect, iNsEcT, INSECT, insect',
   math:        { π1, τ1 },
   };

export { info1 };
