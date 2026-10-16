import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, polyBody, woodGrain, rivet, shift, type RGB } from './helpers';

function mapTable(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,wood:RGB=[122+r()*15,77+r()*9,40+r()*7];
 rectBody(g,-w*.48,-h*.43,w*.96,h*.86,Math.min(w,h)*.05,wood,{lw:2,light:24,dark:32});
 g.save();g.beginPath();g.roundRect(-w*.46,-h*.41,w*.92,h*.82,Math.min(w,h)*.04);g.clip();woodGrain(g,r,[-w*.46,-h*.41,w*.46,h*.41],wood,{lines:13,knots:2});g.restore();
 // parchment sheet with hand-drawn coastlines and contour marks
 polyBody(g,[[-w*.35,-h*.29],[w*.22,-h*.33],[w*.35,-h*.1],[w*.28,h*.28],[-w*.27,h*.31],[-w*.37,h*.08]],[221,202,158],{lw:1.2,light:20,dark:18});
 g.save();g.translate(-w*.01,-h*.01);g.rotate(-.08);
 g.strokeStyle='rgba(89,94,69,.75)';g.lineWidth=1.2;g.beginPath();g.moveTo(-w*.26,-h*.15);g.bezierCurveTo(-w*.08,-h*.25,-w*.08,h*.02,w*.04,-h*.03);g.bezierCurveTo(w*.16,-h*.09,w*.12,h*.14,w*.28,h*.16);g.stroke();
 for(let i=0;i<6;i++){const x=-w*.2+i*w*.07,y=-h*.18+(r()-.5)*h*.08;g.beginPath();g.ellipse(x,y,w*.025,h*.03,.4,0,Math.PI*2);g.strokeStyle='rgba(96,86,57,.55)';g.lineWidth=.7;g.stroke();}
 g.strokeStyle='rgba(130,62,39,.65)';g.lineWidth=1;g.beginPath();g.arc(w*.2,-h*.18,w*.045,0,Math.PI*2);g.moveTo(w*.2-w*.06,-h*.18);g.lineTo(w*.2+w*.06,-h*.18);g.moveTo(w*.2,-h*.24);g.lineTo(w*.2,-h*.12);g.stroke();g.restore();
 // brass dividers and compass
 g.save();g.translate(w*.32,h*.22);g.rotate(-.5);rectBody(g,-w*.025,-h*.17,w*.05,h*.34,1,[164,126,66],{lw:.8,light:24,dark:24});ellBody(g,0,-h*.17,w*.035,h*.035,[192,151,73],{lw:.8});g.restore();
}
function rolledMaps(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o;
 for(let i=0;i<5;i++){const x=(i-2)*w*.16+(r()-.5)*w*.04,y=(r()-.5)*h*.18;g.save();g.translate(x,y);g.rotate((r()-.5)*.3);rectBody(g,-w*.065,-h*.29,w*.13,h*.58,2,[211+r()*12,190+r()*12,145+r()*10],{lw:1.2,light:22,dark:20});ellBody(g,0,-h*.28,w*.064,h*.045,[133,95,54],{lw:.9,light:20,dark:24});ellBody(g,0,h*.28,w*.064,h*.045,[133,95,54],{lw:.9,light:20,dark:24});g.strokeStyle='rgba(115,83,48,.55)';g.lineWidth=.7;g.beginPath();g.moveTo(-w*.035,-h*.12);g.quadraticCurveTo(w*.025,0,-w*.02,h*.12);g.stroke();g.restore();}
}
function compassCase(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o;
 ellBody(g,0,0,w*.4,h*.4,[144,103,52],{lw:2,light:28,dark:30});
 ellBody(g,0,0,w*.32,h*.32,[186,161,111],{lw:1.3,light:25,dark:22});
 ellBody(g,0,0,w*.25,h*.25,[68,80,73],{lw:1.1,light:12,dark:20});
 polyBody(g,[[0,-h*.22],[w*.06,0],[0,h*.22],[-w*.06,0]],[211,178,93],{lw:1,light:25,dark:25});
 polyBody(g,[[0,-h*.22],[-w*.06,0],[0,h*.04],[w*.02,-h*.04]],[183,58,43],{lw:.8,light:20,dark:25});
 ellBody(g,0,0,w*.025,h*.025,[228,209,153],{lw:.5});
 for(let i=0;i<8;i++){const a=i*Math.PI/4;g.strokeStyle='rgba(238,219,166,.7)';g.lineWidth=.8;g.beginPath();g.moveTo(Math.cos(a)*w*.26,Math.sin(a)*h*.26);g.lineTo(Math.cos(a)*w*.29,Math.sin(a)*h*.29);g.stroke();}
}
export const cartographyKinds:ObjectKind[]=[
 kind({key:'cartography_map_table',family:'cartographer',name:'Kartografens arbejdsbord',w:2,h:1,shadow:4,tags:['indoor','shop'],draw:mapTable}),
 kind({key:'cartography_map_rolls',family:'cartographer',name:'Ruller med kort',w:.8,h:.8,shadow:2,randomRotation:true,sizeJitter:.08,tags:['shop','rich'],draw:rolledMaps}),
 kind({key:'cartography_compass',family:'cartographer',name:'Messingkompas',w:.45,h:.45,shadow:2,randomRotation:true,tags:['shop','rich'],draw:compassCase}),
];