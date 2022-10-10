//! replacer-util ~~ MIT License
// File: mock1.js

let π = 3.14;
let τ = 2 * π;

const info = {
   banner:      '🔍🔍🔍 {{pkg.name}} v{{pkg.version}} 🔍🔍🔍',
   description: '{{pkg.description}}',
   list1:       'insect, insect, insect',
   list2:       'insect, iNsEcT, INSECT, insect',
   math:        { π, τ },
   };

export { info };
