import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, woodGrain, shift, type RGB } from './helpers';

// A bookshelf is drawn as its footprint from directly above: exposed book covers and shelf rails,
// never a frontal view of upright spines.
function bookshelf(g: CanvasRenderingContext2D, o: DrawInput, style: number): void {
  const r=rng(o.seed),{w,h}=o;
  const wood:RGB=style===0?[119,76,42]:style===1?[72,43,29]:style===2?[142,96,54]:style===3?[91,62,42]:[105,66,37];
  rectBody(g,-w*.49,-h*.48,w*.98,h*.96,Math.min(w,h)*.035,wood,{lw:2,light:25,dark:34,ao:1.4,rim:1});
  woodGrain(g,r,[-w*.45,-h*.44,w*.45,-h*.35],wood,{lines:8,knots:style===2?2:1});
  rectBody(g,-w*.425,-h*.34,w*.85,h*.68,1.5,[42,28,20],{lw:1,light:5,dark:15});
  const palettes:RGB[]=[[139,48,39],[46,67,99],[166,119,48],[49,82,57],[101,55,87],[177,146,97],[63,43,31]];
  const rows=style===3?2:3,rowH=h*.68/rows;
  for(let row=0;row<rows;row++){
    const y=-h*.34+row*rowH;
    if(row)rectBody(g,-w*.42,y-rowH*.035,w*.84,rowH*.07,1,shift(wood,9),{lw:.7,light:15,dark:20});
    const n=(style===4?5:7)+Math.floor(r()*3),gap=w*.012,bw=(w*.78-gap*(n-1))/n;
    for(let i=0;i<n;i++){
      const bx=-w*.39+i*(bw+gap),bh=rowH*(.62+r()*.25),by=y+(rowH-bh)/2;
      const c=shift(palettes[Math.floor(r()*palettes.length)]!,(r()-.5)*18);
      g.save();g.translate(bx+bw/2,by+bh/2);g.rotate((r()-.5)*.08);
      rectBody(g,-bw*.47,-bh*.49,bw*.94,bh*.98,Math.min(bw,bh)*.08,c,{lw:.65,light:18,dark:24,ao:.4,rim:.4});
      g.strokeStyle='rgba(242,211,151,.75)';g.lineWidth=Math.max(.45,bw*.035);g.beginPath();g.moveTo(-bw*.28,-bh*.38);g.lineTo(-bw*.28,bh*.38);g.stroke();
      if(r()>.35){g.strokeStyle='rgba(229,183,91,.8)';g.lineWidth=Math.max(.4,bw*.025);g.beginPath();g.moveTo(-bw*.1,-bh*.32);g.lineTo(bw*.32,-bh*.32);g.stroke();}
      g.restore();
    }
  }
  rectBody(g,-w*.475,-h*.465,w*.95,h*.075,1,shift(wood,12),{lw:.8,light:20,dark:24});
  rectBody(g,-w*.475,h*.39,w*.95,h*.075,1,shift(wood,5),{lw:.8,light:18,dark:26});
  for(const x of [-w*.435,w*.435])for(const y of [-h*.425,h*.425]){g.fillStyle='rgba(226,184,105,.8)';g.beginPath();g.arc(x,y,Math.max(.65,Math.min(w,h)*.018),0,Math.PI*2);g.fill();}
}
export const bookshelfKinds:ObjectKind[]=[
 kind({key:'bookshelf_oak_full',family:'bookshelf',name:'Bogreol i eg',w:1.5,h:.55,shadow:3,bleed:.02,draw:(g,o)=>bookshelf(g,o,0)}),
 kind({key:'bookshelf_dark_wood',family:'bookshelf',name:'Bogreol i mørkt træ',w:1.5,h:.55,shadow:3,bleed:.02,draw:(g,o)=>bookshelf(g,o,1)}),
 kind({key:'bookshelf_tall_books',family:'bookshelf',name:'Høj bogreol med bøger',w:1.5,h:.6,shadow:3,bleed:.02,draw:(g,o)=>bookshelf(g,o,2)}),
 kind({key:'bookshelf_low',family:'bookshelf',name:'Lav bogreol',w:1.5,h:.5,shadow:2,bleed:.02,draw:(g,o)=>bookshelf(g,o,3)}),
 kind({key:'bookshelf_ornate',family:'bookshelf',name:'Udsmykket bogreol',w:1.5,h:.6,shadow:3,bleed:.02,draw:(g,o)=>bookshelf(g,o,4)}),
];