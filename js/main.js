import {buildRoom} from './room.js';
import * as C from './content.js';
import {show,isOpen} from './ui.js';
import {flappy} from './flappy.js';
const T=THREE,cv=document.getElementById('c'),$=id=>document.getElementById(id);
const R=new T.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.shadowMap.enabled=true;
const S=new T.Scene();S.background=new T.Color(0xffd9b0);S.fog=new T.Fog(0xffd9b0,8,20);
const cam=new T.PerspectiveCamera(70,1,.1,50);cam.position.set(0,1.6,2.5);
const resize=()=>{R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()};addEventListener('resize',resize);resize();
const hit=[],on=(m,label,fn)=>{m.userData={label,fn};hit.push(m)};
const {col,motes}=buildRoom(S,on,{
 about:()=>show(`<h2>About me</h2><p>${C.ABOUT}</p>`),
 projects:()=>show(`<h2>Projects</h2>${C.PROJECTS.map(p=>`<p>• ${p}</p>`).join('')}`),
 paper:()=>show(`<h2>${C.PAPER.title}</h2><p><i>${C.PAPER.venue}</i></p><p>${C.PAPER.abs}</p><a class="btn" href="${C.PAPER.link}" target="_blank" rel="noopener">Read the paper</a>`),
 contact:()=>show(`<h2>Find me</h2>${C.CONTACT.map(([n,u])=>`<a class="btn" href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}`),
 game:()=>{show(`<h2>Games</h2><p>Click or press Space to flap.</p><canvas id="g" width="320" height="400"></canvas>`,flappy($('g')))}});
let yaw=0,pitch=0,keys={},drag=null,loaded=false;
addEventListener('keydown',e=>keys[e.key.toLowerCase()]=1);addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
const ray=new T.Raycaster(),mp=new T.Vector2(),tag=$('tag');
const cast=e=>{mp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mp,cam);
  const h=ray.intersectObjects(hit,true)[0];if(!h)return;
  let o=h.object;while(o&&!o.userData.fn)o=o.parent;
  return o&&{object:o}};
cv.addEventListener('pointerdown',e=>drag={x:e.clientX,y:e.clientY,m:0});
addEventListener('pointerup',e=>{if(drag&&drag.m<6&&loaded&&!isOpen()){const h=cast(e);if(h)h.object.userData.fn()}drag=null});
addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.m+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.005;pitch=Math.max(-1.2,Math.min(1.2,pitch-dy*.005));drag.x=e.clientX;drag.y=e.clientY}
 else if(loaded){const h=cast(e);cv.style.cursor=h?'pointer':'default';tag.style.display=h?'block':'none';if(h)tag.textContent=h.object.userData.label}});
const ok=(x,z)=>Math.abs(x)<3.6&&Math.abs(z)<3.6&&!col.some(b=>x>b[0]-.3&&x<b[1]+.3&&z>b[2]-.3&&z<b[3]+.3);
let last=0;
(function loop(t){requestAnimationFrame(loop);const dt=Math.min((t-last)/1000,.05);last=t;
 if(loaded&&!isOpen()){const f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),s=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),sp=2.4*dt;
  const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*sp,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*sp;
  if(ok(cam.position.x+dx,cam.position.z))cam.position.x+=dx;if(ok(cam.position.x,cam.position.z+dz))cam.position.z+=dz}
 motes.rotation.y+=dt*.02;cam.rotation.set(pitch,yaw,0,'YXZ');R.render(S,cam)})(0);
// loading screen
const msg="hi, i’m almira raisa izzatina, or call me sasya — welcome to my room!";let i=0,pr=0;
const ty=setInterval(()=>{$('intro').textContent=msg.slice(0,++i);if(i>=msg.length)clearInterval(ty)},70);
const pg=setInterval(()=>{pr=Math.min(100,pr+1.6);$('fill').style.width=pr+'%';if(pr>=100){clearInterval(pg);document.querySelector('#load h1').style.opacity=1;$('enter').style.display='inline-block'}},50);
$('enter').onclick=()=>{$('load').style.opacity=0;setTimeout(()=>$('load').style.display='none',800);loaded=true};
