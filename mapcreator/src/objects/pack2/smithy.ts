import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, polyBody, woodGrain, rivet, shift, type RGB } from './helpers';

function anvil(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed), {w,h}=o, s=Math.min(w,h);
  const metal: RGB=[91+r()*10,96+r()*9,101+r()*8];
  polyBody(g,[[-w*.42,-h*.1],[-w*.28,-h*.2],[-w*.13,-h*.35],[w*.2,-h*.35],[w*.33,-h*.18],[w*.43,-h*.12],[w*.4,h*.02],[w*.19,h*.07],[w*.12,h*.23],[-w*.16,h*.23],[-w*.23,h*.08],[-w*.42,h*.02]],metal,{lw:2,light:30,dark:36,ao:2,rim:1.3});
  polyBody(g,[[-w*.12,-h*.3],[w*.18,-h*.3],[w*.28,-h*.17],[w*.18,-h*.08],[-w*.24,-h*.08],[-w*.31,-h*.13]],shift(metal,18),{lw:1,light:25,dark:25});
  rectBody(g,-w*.15,h*.18,w*.3,h*.16,s*.025,[83,57,36],{lw:1.4,light:22,dark:28});
  woodGrain(g,r,[-w*.14,h*.19,w*.14,h*.33],[83,57,36],{lines:4,knots:1});
  ellBody(g,-w*.22,-h*.18,s*.025,s*.018,[222,218,202],{lw:.6,light:35,dark:18});
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