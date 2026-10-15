import fs from 'node:fs/promises';
await fs.mkdir('dist',{recursive:true});
await fs.cp('public','dist',{recursive:true});
await fs.writeFile('dist/.nojekyll','');
const domain=await fs.readFile('public/domain.js','utf8');
await fs.writeFile('apps-script/Domain.gs','// Generated from public/domain.js by npm run build.\n'+domain.replace(/^export /gm,''));
console.log('Built dist/ and apps-script/Domain.gs. No private data included.');
