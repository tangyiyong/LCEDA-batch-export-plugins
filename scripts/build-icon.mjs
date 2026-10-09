import { Resvg } from '@resvg/resvg-js';import fs from 'node:fs/promises';
const svg=await fs.readFile('images/logo.svg','utf8');await fs.writeFile('images/logo.png',new Resvg(svg).render().asPng());
