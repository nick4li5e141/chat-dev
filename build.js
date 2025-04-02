// build.js
import exe from '@angablue/exe';
const build = exe({
    entry: 'public/index.html',
    out: './build/Akeena.exe',
    target: 'latest-win-x64'
});

build.then(() => console.log('Build completed!'));