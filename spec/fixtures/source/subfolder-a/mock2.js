//! replacer-util ~~ MIT License
// File: mock2.js

let π2 = 3.14;
let τ2 = 2 * π2;

const info2 = {
   banner:      '🔍🔍🔍 {{package.name}} v{{package.version}} 🔍🔍🔍',
   description: '{{package.description}}',
   code:        '{{file.name}}',
   file:        '{{file | json}}',
   year:        '{{"now" | date: "%Y"}}',
   list1:       'insect, insect, insect',
   list2:       'insect, iNsEcT, INSECT, insect',
   math:        { π2, τ2 },
   };

export { info2 };
//# sourceMappingURL=mock2.js.map
