import * as ai from 'ai';
console.log(Object.keys(ai).filter(k => k.includes('Stream') || k.includes('Response')));
