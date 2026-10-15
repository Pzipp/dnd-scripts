import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, polyBody, woodGrain, rivet, shift, type RGB } from './helpers';

function anvil(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,s=Math.min(w,h);
 const metal:RGB=[91+r()*8,98+r()*8,105+r()*8];
 // Traditional anvil footprint from directly above: horn to the left, broad flat face, narrow waist.
 polyBody(g,[[-w*.46,-h*.17],[-w*.28,-h*.27],[-w*.08,-h*.24],[w*.23,-h*.23],[w*.37,-h*.13],[w*.44,-h*.05],[w*.38,h*.02],[w*.22,h*.05],[-w*.12,h*.06],[-w*.3,h*.19],[-w*.45,h*.24],[-w*.41,h*.1],[-w*.27,h*.01],[-w*.39,-h*.04]],metal,{lw:2,light:32,dark:36,ao:1.4,rim:1.2});
 polyBody(g,[[-w*.2,-h*.2],[w*.22,-h*.19],[w*.32,-h*.1],[w*.25,-h*.025],[-w*.19,-h*.015],[-w*.27,-h*.08]],shift(metal,22),{lw:1.1,light:32,dark:25,ao:.4,rim:1});
 g.strokeStyle='rgba(239,232,211,.65)';g.lineWidth=Math.max(.7,s*.018);g.beginPath();g.moveTo(-w*.16,-h*.16);g.lineTo(w*.19,-h*.15);g.stroke();
 ellBody(g,w*.18,-h*.07,s*.025,s*.018,[39,40,41],{lw:.7,light:8,dark:12,ao:0,rim:0});
 ellBody(g,-w*.08,-h*.07,s*.018,s*.014,[44,45,46],{lw:.6,light:8,dark:12,ao:0,rim:0});
 // The wooden stump is a separate, visible top-down round base.
 ellBody(g,-w*.02,h*.2,w*.22,h*.16,[105,70,42],{lw:1.4,light:24,dark:32,ao:1,rim:.7});
 ellBody(g,-w*.05,h*.17,w*.16,h*.105,[132,91,54],{lw:.7,light:22,dark:25,ao:.5,rim:.4});
 for(let i=0;i<5;i++){const yy=h*(.12+i*.035);g.strokeStyle='rgba(53,31,17,.55)';g.lineWidth=.7;g.beginPath();g.moveTo(-w*.17,yy);g.quadraticCurveTo(-w*.03,yy+h*.015,w*.12,yy-h*.005);g.stroke();}
 ellBody(g,-w*.36,h*.25,s*.025,s*.025,[76,77,77],{lw:.6,light:12,dark:16,ao:0,rim:0});
}
function smithBench(g: CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o; const wood:RGB=[112+r()*18,67+r()*12,35+r()*8];
 rectBody(g,-w*.48,-h*.44,w*.96,h*.88,Math.min(w,h)*.05,wood,{lw:2,light:26,dark:34});
 g.save();g.beginPath();g.roundRect(-w*.46,-h*.42,w*.92,h*.84,Math.min(w,h)*.04);g.clip();
 woodGrain(g,r,[-w*.46,-h*.42,w*.46,h*.42],wood,{lines:16,knots:3,contrast:1.2});
 for(let i=1;i<6;i++){const x=-w*.46+i*w*.92/6;g.strokeStyle='rgba(29,14,5,.5)';g.lineWidth=1;g.beginPath();g.moveTo(x,-h*.4);g.lineTo(x+(r()-.5)*2,h*.4);g.stroke();}
 g.restore();
 // hammer, tongs and iron blanks
 g.save();g.translate(-w*.23,-h*.12);g.rotate(-.62);rectBody(g,-w*.025,-h*.2,w*.05,h*.35,2,[117,77,42],{lw:1,light:20,dark:25});rectBody(g,-w*.09,-h*.2,w*.18,h*.09,2,[98,103,105],{lw:1.2,light:28,dark:35});g.restore();
 g.save();g.translate(w*.12,-h*.1);g.rotate(.42);rectBody(g,-w*.025,-h*.2,w*.05,h*.42,2,[91,67,45],{lw:1,light:20,dark:26});g.restore();
 polyBody(g,[[w*.18,h*.13],[w*.34,h*.1],[w*.37,h*.2],[w*.22,h*.24]], [112,117,119],{lw:1.2,light:28,dark:35});
 ellBody(g,w*.36,-h*.25,w*.055,h*.07,[166,65,40],{lw:1.2,light:28,dark:32});
}
function weaponRack(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o; const wood:RGB=[105+r()*14,64+r()*10,34+r()*7];
 rectBody(g,-w*.47,-h*.38,w*.94,h*.76,Math.min(w,h)*.04,wood,{lw:2,light:24,dark:32});
 woodGrain(g,r,[-w*.44,-h*.35,w*.44,h*.35],wood,{lines:10,knots:2});
 for(let i=0;i<3;i++){
  const x=-w*.27+i*w*.27;
  g.save();g.translate(x,0);g.rotate((r()-.5)*.18);
  polyBody(g,[[-w*.035,-h*.29],[w*.035,-h*.29],[w*.02,h*.18],[0,h*.32],[-w*.02,h*.18]],shift([135,143,148],r()*10),{lw:1.2,light:32,dark:35});
  rectBody(g,-w*.055,-h*.08,w*.11,h*.07,2,[117,77,42],{lw:1,light:20,dark:25});
  ellBody(g,0,h*.24,w*.035,h*.035,[114,77,43],{lw:1});
  g.restore();
 }
}
export const smithyKinds:ObjectKind[]=[
 kind({key:'smithy_anvil',family:'smithy',name:'Smedjeambolt',w:1,h:.8,shadow:3,tags:['indoor','village'],draw:anvil}),
 kind({key:'smithy_workbench',family:'smithy',name:'Smedjebænk med værktøj',w:2,h:1,shadow:4,tags:['indoor','village'],draw:smithBench}),
 kind({key:'smithy_weapon_rack',family:'smithy',name:'Våbenstativ',w:1.5,h:.7,shadow:4,tags:['shop','military'],draw:weaponRack}),
];