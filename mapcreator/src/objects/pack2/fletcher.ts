import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, polyBody, woodGrain, shift, type RGB } from './helpers';

function arrows(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o;
 ellBody(g,0,0,w*.43,h*.42,[157,113,65],{lw:1.7,light:25,dark:28});
 ellBody(g,0,0,w*.34,h*.33,[88,57,32],{lw:1,light:12,dark:25});
 for(let i=0,n=8+Math.floor(r()*4);i<n;i++){
  const a=i/n*Math.PI*2+(r()-.5)*.18,rad=.25+r()*.08;
  const x=Math.cos(a)*w*rad,y=Math.sin(a)*h*rad;
  g.save();g.translate(x,y);g.rotate(a+.3);
  rectBody(g,-w*.018,-h*.22,w*.036,h*.44,1,[171,126,70],{lw:.7,light:25,dark:26});
  polyBody(g,[[-w*.045,-h*.2],[0,-h*.3],[w*.045,-h*.2],[0,-h*.14]],[119,120,112],{lw:.8,light:24,dark:30});
  polyBody(g,[[-w*.035,h*.13],[-w*.07,h*.22],[0,h*.19]],shift([173,57,48],r()*22),{lw:.6,light:18,dark:22});
  polyBody(g,[[w*.035,h*.13],[w*.07,h*.22],[0,h*.19]],shift([65,111,67],r()*22),{lw:.6,light:18,dark:22});
  g.restore();
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
function quiver(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o;
 ellBody(g,0,0,w*.39,h*.42,[123,76,43],{lw:1.8,light:28,dark:34});
 ellBody(g,0,-h*.05,w*.29,h*.31,[56,35,22],{lw:1.1,light:8,dark:20});
 for(let i=0;i<7;i++){const x=(r()-.5)*w*.42,y=-h*(.18+r()*.22);g.beginPath();g.moveTo(x,y);g.lineTo(x+(r()-.5)*w*.1,-h*.43);g.strokeStyle='rgb(180,137,79)';g.lineWidth=Math.max(1,w*.025);g.stroke();polyBody(g,[[x-w*.04,-h*.38],[x,-h*.48],[x+w*.04,-h*.38]],[139,145,141],{lw:.8});}
 rectBody(g,-w*.42,h*.03,w*.84,h*.07,2,[157,115,63],{lw:1.1,light:20,dark:24});
}
function rgbString(c:RGB):string{return 'rgb('+c.map(v=>Math.round(v)).join(',')+')';}
export const fletcherKinds:ObjectKind[]=[
 kind({key:'fletcher_arrow_bundle',family:'fletcher',name:'Bundt pile og fjer',w:.8,h:.8,shadow:3,randomRotation:true,sizeJitter:.08,tags:['shop','military'],draw:arrows}),
 kind({key:'fletcher_longbow',family:'fletcher',name:'Langbue',w:.45,h:1.5,shadow:2,randomRotation:true,tags:['shop','military'],draw:bow}),
 kind({key:'fletcher_workbench',family:'fletcher',name:'Pilemagerens arbejdsbord',w:2,h:1,shadow:4,tags:['indoor','shop'],draw:fletcherBench}),
 kind({key:'fletcher_quiver',family:'fletcher',name:'Pilekogger',w:.7,h:.7,shadow:3,randomRotation:true,tags:['shop','military'],draw:quiver}),
];