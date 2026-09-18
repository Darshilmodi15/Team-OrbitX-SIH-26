// Run with `node tools/generate_favicon.cjs` where sharp is available.
const sharp = require("sharp");
const fs = require("node:fs/promises");
const path = require("node:path");
async function main() {
  const root = path.resolve(__dirname, "../frontend/public");
  const source = await fs.readFile(path.join(root, "favicon.svg"));
  for (const [size, name] of [[16,"favicon-16x16.png"],[32,"favicon-32x32.png"],[180,"apple-touch-icon.png"],[192,"android-chrome-192x192.png"],[512,"android-chrome-512x512.png"]]) {
    await sharp(source).resize(size,size).png().toFile(path.join(root,name));
  }
  const sizes=[16,32,48], images=await Promise.all(sizes.map(size=>sharp(source).resize(size,size).png().toBuffer()));
  const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
  let offset=header.length;
  images.forEach((image,index)=>{const p=6+16*index;header[p]=sizes[index];header[p+1]=sizes[index];header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(image.length,p+8);header.writeUInt32LE(offset,p+12);offset+=image.length;});
  await fs.writeFile(path.join(root,"favicon.ico"),Buffer.concat([header,...images]));
  console.log("Generated SVG-derived ICO, 16/32px, Apple and PWA icons");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
