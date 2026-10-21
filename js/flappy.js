// Returns a stop() function. Add more games in js/ the same way.
export function flappy(k){
 const g=k.getContext('2d');let on=true,b,p,sc,dead,best=0;
 const reset=()=>{b={y:200,v:0};p=[{x:340,h:140}];sc=0;dead=false};reset();
 const flap=()=>dead?reset():b.v=-6;k.onpointerdown=flap;
 const key=e=>{if(e.code==='Space'){e.preventDefault();flap()}};addEventListener('keydown',key);
 (function step(){if(!on)return removeEventListener('keydown',key);requestAnimationFrame(step);
  if(!dead){b.v+=.35;b.y+=b.v;p.forEach(o=>o.x-=2.2);if(p[p.length-1].x<160)p.push({x:340,h:80+Math.random()*180});if(p[0].x<-50){p.shift();best=Math.max(best,++sc)}
   p.forEach(o=>{if(72>o.x&&48<o.x+50&&(b.y-12<o.h-60||b.y+12>o.h+60))dead=true});if(b.y>388||b.y<0)dead=true}
  g.fillStyle='#ffd1e3';g.fillRect(0,0,320,400);g.fillStyle='#7bc9a6';p.forEach(o=>{g.fillRect(o.x,0,50,o.h-60);g.fillRect(o.x,o.h+60,50,400)});
  g.fillStyle='#ffb347';g.beginPath();g.arc(60,b.y,12,0,7);g.fill();g.fillStyle='#5a2a4a';g.font='bold 22px monospace';g.fillText(sc+'  best '+best,10,28);
  if(dead)g.fillText('oops! tap to retry',60,200)})();
 return()=>on=false}
