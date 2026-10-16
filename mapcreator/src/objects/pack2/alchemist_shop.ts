import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, polyBody, woodGrain, rivet, shift, type RGB } from './helpers';

function potionCrate(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,wood:RGB=[112+r()*14,68+r()*10,36+r()*8];
 rectBody(g,-w*.46,-h*.42,w*.92,h*.84,Math.min(w,h)*.05,wood,{lw:1.8,light:23,dark:30});
 woodGrain(g,r,[-w*.43,-h*.39,w*.43,h*.39],wood,{lines:10,knots:2});
 for(let i=0;i<6;i++){const x=-w*.32+i*w*.128;ellBody(g,x,0,w*.052,h*.24,[149,180,170],{lw:1,light:20,dark:24,alpha:.9});ellBody(g,x,h*.07,w*.04,h*.14,shift(([66,147,83] as RGB),r()*28),{lw:.6,light:18,dark:20});rectBody(g,x-w*.035,-h*.24,w*.07,h*.06,1,[166,126,63],{lw:.7});}
 rectBody(g,-w*.43,-h*.32,w*.86,h*.07,1,[166,123,62],{lw:1,light:22,dark:25});
 rectBody(g,-w*.43,h*.25,w*.86,h*.07,1,[166,123,62],{lw:1,light:22,dark:25});
}
function ingredientsTray(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o;
 rectBody(g,-w*.47,-h*.43,w*.94,h*.86,Math.min(w,h)*.05,[105,66,37],{lw:1.8,light:24,dark:32});
 for(let i=0;i<6;i++){const x=-w*.35+i*w*.14;ellBody(g,x,0,w*.075,h*.21,[191,174,131],{lw:1,light:22,dark:24});const col:RGB=shift(([83,122,62] as RGB),r()*50-15);for(let j=0;j<3;j++){ellBody(g,x+(r()-.5)*w*.05,-h*.05+(r()-.5)*h*.12,w*.024,h*.045,col,{lw:.5,light:18,dark:20});}}
 rectBody(g,-w*.44,-h*.36,w*.88,h*.08,1,[151,109,57],{lw:.9,light:18,dark:22});
}
function potionBottles(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,style=param(o,'sort','blandet');
 const cols:RGB[]=style==='helbredelse'?[[194,56,63],[221,98,85],[174,37,49]]:[[66,151,98],[56,124,177],[180,102,174],[205,157,56]];
 for(let i=0;i<4;i++){const x=(i-1.5)*w*.21+(r()-.5)*w*.04,y=(r()-.5)*h*.12;g.save();g.translate(x,y);g.rotate((r()-.5)*.15);ellBody(g,0,h*.05,w*.1,h*.16,[157,187,182],{lw:1.1,light:24,dark:25,alpha:.92});ellBody(g,0,h*.08,w*.075,h*.11,cols[i%cols.length]!,{lw:.6,light:24,dark:22});rectBody(g,-w*.035,-h*.13,w*.07,h*.07,1,[145,107,61],{lw:.8});rectBody(g,-w*.045,-h*.17,w*.09,h*.05,1,[184,150,89],{lw:.8,light:18,dark:20});g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;g.beginPath();g.moveTo(-w*.04,h*.02);g.lineTo(-w*.025,h*.08);g.stroke();g.restore();}
}
export const alchemistShopKinds:ObjectKind[]=[
 kind({key:'alchemist_potion_crate',family:'alchemist',name:'Kasse med eliksirer',w:1.2,h:.8,shadow:3,tags:['shop','magic','rich'],draw:potionCrate}),
 kind({key:'alchemist_ingredients_tray',family:'alchemist',name:'Bakke med alkymistiske ingredienser',w:1.2,h:.7,shadow:3,tags:['shop','magic'],draw:ingredientsTray}),
 kind({key:'alchemist_potion_bottles',family:'alchemist',name:'Samling af eliksirer',w:1,h:.6,shadow:2,randomRotation:true,tags:['shop','magic','rich'],params:[{key:'sort',label:'Sortiment',type:'select',default:'blandet',options:[{value:'blandet',label:'Blandet'},{value:'helbredelse',label:'Helbredelse'}]}],draw:potionBottles}),
];