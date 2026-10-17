const fs = require('fs');
const path = require('path');

const pngPath = path.resolve(__dirname, '../public/am-logo.png');
const b64 = fs.readFileSync(pngPath).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${b64}"/>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/icon.svg'), svg, 'utf-8');
fs.writeFileSync(path.resolve(__dirname, '../public/am-logo.svg'), svg, 'utf-8');
console.log('Successfully updated public/icon.svg and public/am-logo.svg to official AM logo');
