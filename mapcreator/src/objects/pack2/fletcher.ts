import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, polyBody, woodGrain, shift, type RGB } from './helpers';

/** Én pil langs lodret akse: spids foroven, fjer forneden. Længden er `len`. */
function arrowShape(g:CanvasRenderingContext2D,r:()=>number,len:number):void{
 const sw=Math.max(1.4,len*.05),tw=len*.06;
 rectBody(g,-sw/2,-len/2,sw,len,1,shift([171,126,70],(r()-.5)*14),{lw:.7,light:25,dark:26});
 polyBody(g,[[-tw,-len*.4],[0,-len/2-len*.04],[tw,-len*.4],[0,-len*.34]],[119,120,112],{lw:.8,light:24,dark:30});
 polyBody(g,[[-sw*.7,len*.3],[-tw*1.5,len/2],[0,len*.44]],shift([173,57,48],r()*22),{lw:.6,light:18,dark:22});
 polyBody(g,[[sw*.7,len*.3],[tw*1.5,len/2],[0,len*.44]],shift([65,111,67],r()*22),{lw:.6,light:18,dark:22});
}
function arrowSingle(g:CanvasRenderingContext2D,o:DrawInput):void{
 arrowShape(g,rng(o.seed),o.h*.94);
}
function arrowsDropped(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,len=Math.min(w,h)*.9;
 for(let i=0,n=5+Math.floor(r()*3);i<n;i++){
  g.save();g.translate((r()-.5)*w*.42,(r()-.5)*h*.36);g.rotate((r()-.5)*Math.PI*.9+Math.PI*.25);
  arrowShape(g,r,len*(.88+r()*.14));g.restore();
 }
}
function bow(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,wood:RGB=[132+r()*15,85+r()*10,44+r()*8];
 g.beginPath();g.moveTo(-w*.32,h*.4);g.quadraticCurveTo(w*.45,h*.15,w*.29,-h*.42);g.strokeStyle='rgba(38,20,8,.9)';g.lineWidth=w*.095;g.stroke();
 g.beginPath();g.moveTo(-w*.32,h*.4);g.quadraticCurveTo(w*.45,h*.15,w*.29,-h*.42);g.strokeStyle='rgb(154,103,53)';g.lineWidth=w*.06;g.stroke();
 g.beginPath();g.moveTo(-w*.32,h*.4);g.lineTo(w*.29,-h*.42);g.strokeStyle='rgba(228,216,188,.85)';g.lineWidth=Math.max(.7,w*.008);g.stroke();
 ellBody(g,-w*.03,h*.13,w*.05,h*.07,[104,67,38],{lw:1});
 for(let i=0;i<3;i++){g.strokeStyle=rgbString(shift(wood,i*8));g.lineWidth=.7;g.beginPath();g.moveTo(-w*.2+i*w*.08,h*.3-i*h*.1);g.lineTo(-w*.13+i*w*.08,h*.25-i*h*.1);g.stroke();}
}
function fletcherBench(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,wood:RGB=[121+r()*14,75+r()*9,39+r()*8];
 rectBody(g,-w*.48,-h*.43,w*.96,h*.86,Math.min(w,h)*.05,wood,{lw:2,light:25,dark:32});
 g.save();g.beginPath();g.roundRect(-w*.46,-h*.41,w*.92,h*.82,Math.min(w,h)*.04);g.clip();woodGrain(g,r,[-w*.46,-h*.41,w*.46,h*.41],wood,{lines:14,knots:2});g.restore();
 for(let i=0;i<5;i++){const x=-w*.32+i*w*.16;g.save();g.translate(x,(r()-.5)*h*.08);g.rotate((r()-.5)*.14);rectBody(g,-w*.018,-h*.3,w*.036,h*.6,1,[173,130,73],{lw:.7,light:20,dark:24});polyBody(g,[[-w*.045,-h*.26],[0,-h*.35],[w*.045,-h*.26],[0,-h*.18]],shift([133,136,130],r()*15),{lw:.8});polyBody(g,[[-w*.025,h*.2],[-w*.08,h*.32],[0,h*.28]],shift([174,65,48],r()*18),{lw:.7});polyBody(g,[[w*.025,h*.2],[w*.08,h*.32],[0,h*.28]],shift([63,111,72],r()*18),{lw:.7});g.restore();}
 ellBody(g,w*.31,-h*.19,w*.09,h*.08,[201,174,124],{lw:1.2,light:24,dark:20});
}
function rgbString(c:RGB):string{return 'rgb('+c.map(v=>Math.round(v)).join(',')+')';}
export const fletcherKinds:ObjectKind[]=[
 kind({key:'fletcher_arrow',family:'fletcher',name:'Pil',w:.2,h:.75,shadow:2,randomRotation:true,tags:['shop','military'],draw:arrowSingle}),
 kind({key:'fletcher_arrows_dropped',family:'fletcher',name:'Tabte pile',w:.9,h:.7,shadow:2,randomRotation:true,tags:['shop','military'],draw:arrowsDropped}),
 kind({key:'fletcher_longbow',family:'fletcher',name:'Langbue',w:.45,h:1.5,shadow:2,randomRotation:true,tags:['shop','military'],draw:bow}),
 kind({key:'fletcher_workbench',family:'fletcher',name:'Pilemagerens arbejdsbord',w:2,h:1,shadow:4,tags:['indoor','shop'],draw:fletcherBench}),
];