import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, polyBody, woodGrain, shift, type RGB } from './helpers';

function bookStack(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o;
 for(let i=0;i<5;i++){const x=(i-2)*w*.13+(r()-.5)*w*.025,y=(r()-.5)*h*.12;g.save();g.translate(x,y);g.rotate((r()-.5)*.16);const bh=h*(.5+r()*.15),bw=w*(.18+r()*.025),col:RGB=shift(([127,54,43] as RGB),r()*35-12);rectBody(g,-bw/2,-bh/2,bw,bh,2,col,{lw:1.2,light:25,dark:30});rectBody(g,-bw*.42,-bh*.44,bw*.84,bh*.08,1,[203,174,119],{lw:.6,light:18,dark:15});rectBody(g,-bw*.42,bh*.35,bw*.84,bh*.08,1,[203,174,119],{lw:.6,light:18,dark:15});g.strokeStyle='rgba(226,188,111,.8)';g.lineWidth=Math.max(.7,w*.008);g.beginPath();g.moveTo(-bw*.28,-bh*.3);g.lineTo(-bw*.28,bh*.3);g.moveTo(bw*.28,-bh*.3);g.lineTo(bw*.28,bh*.3);g.stroke();g.restore();}
}
function openLedger(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o;
 polyBody(g,[[-w*.44,-h*.34],[-w*.04,-h*.42],[0,h*.31],[-w*.39,h*.39]],[115,63,43],{lw:1.8,light:24,dark:30});
 polyBody(g,[[w*.04,-h*.42],[w*.44,-h*.34],[w*.39,h*.39],[0,h*.31]],[132,77,49],{lw:1.8,light:24,dark:30});
 polyBody(g,[[-w*.37,-h*.3],[-w*.06,-h*.34],[-w*.01,h*.25],[-w*.33,h*.3]],[222,204,164],{lw:.8,light:15,dark:15});
 polyBody(g,[[w*.06,-h*.34],[w*.37,-h*.3],[w*.33,h*.3],[w*.01,h*.25]],[222,204,164],{lw:.8,light:15,dark:15});
 for(let i=0;i<6;i++){const y=-h*.22+i*h*.075;g.strokeStyle='rgba(103,76,52,.55)';g.lineWidth=.7;g.beginPath();g.moveTo(-w*.29,y);g.lineTo(-w*.06,y-h*.01);g.moveTo(w*.07,y-h*.01);g.lineTo(w*.29,y);g.stroke();}
 ellBody(g,0,0,w*.035,h*.05,[179,143,76],{lw:.7,light:22,dark:22});
}
function displayDesk(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,wood:RGB=[116+r()*14,70+r()*10,36+r()*8];
 rectBody(g,-w*.48,-h*.43,w*.96,h*.86,Math.min(w,h)*.05,wood,{lw:2,light:24,dark:32});
 g.save();g.beginPath();g.roundRect(-w*.46,-h*.41,w*.92,h*.82,Math.min(w,h)*.04);g.clip();woodGrain(g,r,[-w*.46,-h*.41,w*.46,h*.41],wood,{lines:13,knots:2});g.restore();
 for(let i=0;i<4;i++){const x=-w*.31+i*w*.2,y=(i%2?1:-1)*h*.14;g.save();g.translate(x,y);g.rotate((r()-.5)*.14);rectBody(g,-w*.065,-h*.19,w*.13,h*.38,2,shift(([139,61,43] as RGB),r()*24),{lw:1.1,light:25,dark:28});rectBody(g,-w*.055,-h*.16,w*.11,h*.05,1,[208,178,118],{lw:.5});g.strokeStyle='rgba(230,197,128,.8)';g.lineWidth=.8;g.beginPath();g.moveTo(-w*.035,-h*.08);g.lineTo(w*.035,-h*.08);g.moveTo(-w*.035,h*.02);g.lineTo(w*.035,h*.02);g.stroke();g.restore();}
}
export const booksellerKinds:ObjectKind[]=[
 kind({key:'bookseller_book_stack',family:'bookseller',name:'Stabel indbundne bøger',w:.9,h:.8,shadow:2,randomRotation:true,sizeJitter:.08,tags:['shop','rich'],draw:bookStack}),
 kind({key:'bookseller_open_ledger',family:'bookseller',name:'Opslået regnskabsbog',w:.8,h:.6,shadow:2,tags:['shop','indoor'],draw:openLedger}),
 kind({key:'bookseller_display_desk',family:'bookseller',name:'Boghandlerens udstillingsbord',w:2,h:1,shadow:4,tags:['shop','indoor','rich'],draw:displayDesk}),
];