import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { blobBody, wobble, ellBody, shift, type RGB } from './helpers';

// True overhead view: a broad round cap with a painted gradient and naturally scattered flecks.
function giantMushroom(g:CanvasRenderingContext2D,o:DrawInput):void{
 const r=rng(o.seed),{w,h}=o,choice=param(o,'hat','rød');
 const cap:RGB=choice==='blå'?[57,101,139]:choice==='brun'?[132,82,48]:[174,57,43];
 const cx=(r()-.5)*w*.035,cy=(r()-.5)*h*.035,rx=w*(.455+r()*.018),ry=h*(.455+r()*.018);
 blobBody(g,wobble(r,cx,cy,rx,ry,22,.055),shift(cap,-24),{lw:2,light:24,dark:34,ao:1.5,rim:1});
 blobBody(g,wobble(r,cx,cy,rx*.94,ry*.94,22,.045),cap,{lw:1.2,light:38,dark:30,ao:1,rim:.7});
 const grad=g.createRadialGradient(cx-rx*.28,cy-ry*.32,rx*.03,cx,cy,rx*1.02);
 grad.addColorStop(0,'rgba(255,220,158,.46)');grad.addColorStop(.48,'rgba(255,193,112,.08)');grad.addColorStop(1,'rgba(48,20,16,.42)');
 g.save();g.beginPath();g.ellipse(cx,cy,rx*.92,ry*.92,0,0,Math.PI*2);g.fillStyle=grad;g.fill();g.restore();
 const n=(choice==='blå'?13:18)+Math.floor(r()*11);
 for(let i=0;i<n;i++){
  const a=r()*Math.PI*2,rad=Math.sqrt(.08+r()*.78),x=cx+Math.cos(a)*rx*rad,y=cy+Math.sin(a)*ry*rad,size=.012+r()*.022;
  ellBody(g,x,y,w*size,h*size*(.65+r()*.65),choice==='blå'?[220,224,207]:[244,222,174],{lw:.45,light:20,dark:16,ao:0,rim:.2});
  if(r()>.55)ellBody(g,x-w*size*.18,y-h*size*.2,w*size*.28,h*size*.2,[255,244,207],{lw:.4,light:10,dark:8,ao:0,rim:0,outline:null});
 }
 // Small central ring gives scale and organic structure without a side-view stalk.
 ellBody(g,cx,cy,w*.055,h*.05,shift(cap,30),{lw:.8,light:25,dark:20,ao:.3,rim:.4});
 ellBody(g,cx-w*.008,cy-h*.008,w*.025,h*.022,shift(cap,44),{lw:.4,light:16,dark:12,ao:0,rim:0,outline:null});
}
export const giantMushroomKinds:ObjectKind[]=[
 kind({key:'mushroom_giant',family:'mushroom',name:'Kæmpesvamp',w:1.5,h:1.5,randomRotation:true,sizeJitter:.1,shadow:4,bleed:.025,
 params:[{key:'hat',label:'Hatfarve',type:'select',default:'rød',options:[{value:'rød',label:'Rød'},{value:'blå',label:'Blå'},{value:'brun',label:'Brun'}]}],
 tags:['magic','cave'],draw:giantMushroom}),
];