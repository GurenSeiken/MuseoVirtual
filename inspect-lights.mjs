// Script to inspect the Luces.glb file
import { readFileSync } from 'fs';

const buffer = readFileSync('./public/models/Luces.glb');

let offset = 12;
const jsonChunkLength = buffer.readUInt32LE(offset);
offset += 8;

const jsonStr = buffer.toString('utf8', offset, offset + jsonChunkLength);
const gltf = JSON.parse(jsonStr);

// Pretty print the entire JSON for a small file
console.log(JSON.stringify(gltf, null, 2));
