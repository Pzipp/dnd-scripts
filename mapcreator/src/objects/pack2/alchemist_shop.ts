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
 rectBody(g,-w*.43,-h*.39,w*.86,h*.78,Math.min(w,h)*.035,[66,43,28],{lw:.8,light:12,dark:24});
 // Three to five little bowls, each with different herbs, berries, powders or dried roots.
 const count=3+Math.floor(r()*3);
 for(let i=0;i<count;i++){
  const cols=count===3?[-.27,0,.27]:count===4?[-.3,-.1,.12,.31]:[-.32,-.16,0,.16,.32];
  const x=w*cols[i]!,y=h*((i%2===0)?-.17:.16),rx=w*(.065+r()*.012),ry=h*(.14+r()*.025);
  const bowl:RGB= r()>.5?[129,88,53]:[94,70,48];
  ellBody(g,x,y,rx*1.18,ry*1.12,bowl,{lw:1,light:22,dark:28});
  ellBody(g,x,y-h*.01,rx,ry,[189,151,86],{lw:.7,light:18,dark:20});
  const herb= Math.floor(r()*4);
  for(let j=0;j<7+Math.floor(r()*5);j++){
   const a=r()*Math.PI*2,rad=Math.sqrt(r())*.78,px=x+Math.cos(a)*rx*rad,py=y+Math.sin(a)*ry*rad;
   const color:RGB=herb===0?[67,111,53]:herb===1?[136,55,50]:herb===2?[210,174,76]:[94,104,139];
   ellBody(g,px,py,rx*(.12+r()*.12),ry*(.08+r()*.12),shift(color,(r()-.5)*22),{lw:.35,light:16,dark:18,ao:0,rim:.2});
  }
 }
 // A pestle and a few loose sprigs/roots make the tray read as an active work surface.
 ellBody(g,w*.31,-h*.23,w*.075,h*.08,[171,165,142],{lw:1,light:24,dark:25});
 g.save();g.translate(w*.31,-h*.23);g.rotate(.55);rectBody(g,-w*.018,-h*.16,w*.036,h*.32,1,[202,191,161],{lw:.7,light:20,dark:25});g.restore();
 for(let i=0;i<5;i++){const x=-w*.34+i*w*.14,y=h*(.31+(r()-.5)*.06);g.strokeStyle='rgba(76,104,49,.85)';g.lineWidth=1.2;g.beginPath();g.moveTo(x-w*.025,y+h*.025);g.quadraticCurveTo(x,y-h*.015,x+w*.035,y-h*.03);g.stroke();ellBody(g,x+w*.01,y-h*.015,w*.018,h*.025,[78,121,57],{lw:.3,light:14,dark:18,ao:0,rim:0});}
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