import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, polyBody, woodGrain, rivet, shift, type RGB } from './helpers';

function leatherBench(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,wood:RGB=[119+r()*15,72+r()*10,37+r()*8];
 rectBody(g,-w*.48,-h*.43,w*.96,h*.86,Math.min(w,h)*.05,wood,{lw:2,light:24,dark:32});
 g.save();g.beginPath();g.roundRect(-w*.46,-h*.41,w*.92,h*.82,Math.min(w,h)*.04);g.clip();woodGrain(g,r,[-w*.46,-h*.41,w*.46,h*.41],wood,{lines:14,knots:2});g.restore();
 // folded leather, awl, punch and thread spool
 polyBody(g,[[-w*.37,-h*.27],[-w*.08,-h*.32],[w*.03,-h*.12],[-w*.06,h*.02],[-w*.34,-h*.03]],[126,68,39],{lw:1.3,light:28,dark:28});
 g.strokeStyle='rgba(230,178,105,.8)';g.lineWidth=1;g.beginPath();g.moveTo(-w*.31,-h*.22);g.lineTo(-w*.08,-h*.23);g.lineTo(-w*.02,-h*.12);g.stroke();
 g.save();g.translate(w*.16,-h*.12);g.rotate(.35);rectBody(g,-w*.018,-h*.22,w*.036,h*.42,1,[132,91,52],{lw:.8});polyBody(g,[[-w*.025,-h*.22],[w*.025,-h*.22],[0,-h*.31]],[157,160,156],{lw:.7});g.restore();
 ellBody(g,w*.3,h*.18,w*.075,h*.08,[176,133,74],{lw:1.2,light:24,dark:26});
 ellBody(g,w*.3,h*.18,w*.025,h*.028,[91,52,26],{lw:.6});
}
function armorDisplay(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o;
 rectBody(g,-w*.46,-h*.42,w*.92,h*.84,Math.min(w,h)*.04,[109,73,42],{lw:2,light:23,dark:30});
 woodGrain(g,r,[-w*.43,-h*.39,w*.43,h*.39],[109,73,42],{lines:10,knots:1});
 // chest piece, bracers, belt and buckles
 polyBody(g,[[-w*.3,-h*.24],[-w*.08,-h*.29],[w*.02,-h*.1],[0,h*.06],[-w*.24,h*.03]], [139,83,48],{lw:1.4,light:28,dark:32});
 for(let i=0;i<2;i++){const x=w*(.12+i*.15);rectBody(g,x,-h*.2,w*.09,h*.34,h*.04,[126,72,40],{lw:1.2,light:25,dark:30});g.strokeStyle='rgba(226,179,112,.7)';g.lineWidth=1;g.beginPath();g.moveTo(x+w*.02,-h*.12);g.lineTo(x+w*.07,h*.08);g.stroke();}
 rectBody(g,-w*.28,h*.16,w*.58,h*.08,2,[74,43,26],{lw:1.2});
 rectBody(g,w*.01,h*.13,w*.1,h*.14,2,[174,133,58],{lw:1.2,light:25,dark:28});ellBody(g,w*.06,h*.2,w*.02,h*.025,[50,34,18],{lw:.6});
}
export const leatherworkKinds:ObjectKind[]=[
 kind({key:'leatherwork_bench',family:'leatherwork',name:'Læderarbejderens bord',w:2,h:1,shadow:4,tags:['indoor','shop'],draw:leatherBench}),
 kind({key:'leatherwork_armor_display',family:'leatherwork',name:'Læderrustning og bælter',w:1.5,h:1,shadow:4,tags:['shop','military'],draw:armorDisplay}),
];