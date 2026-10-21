// Builds the room. Add furniture by adding lines below. on(mesh,label,fn) makes something clickable.
const T=THREE;
export function buildRoom(S,on,A){
 const col=[]; // collision boxes [minx,maxx,minz,maxz]
 const M=(g,c,x,y,z,ry=0,cast=true)=>{const m=new T.Mesh(g,new T.MeshLambertMaterial({color:c}));m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=cast;m.receiveShadow=true;S.add(m);return m};
 const B=(w,h,d,c,x,y,z,ry,cast)=>M(new T.BoxGeometry(w,h,d),c,x,y,z,ry,cast);
 const Sp=(r,c,x,y,z)=>M(new T.SphereGeometry(r,16,12),c,x,y,z);
 const Cy=(r,h,c,x,y,z)=>M(new T.CylinderGeometry(r,r,h,16),c,x,y,z);
 const tex=(draw,w=256,h=256)=>{const k=document.createElement('canvas');k.width=w;k.height=h;draw(k.getContext('2d'),w,h);return new T.CanvasTexture(k)};
 const P=(w,h,t,x,y,z,ry,basic)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),basic?new T.MeshBasicMaterial({map:t}):new T.MeshLambertMaterial({map:t}));m.position.set(x,y,z);m.rotation.y=ry;S.add(m);return m};
 const books=(x,y,z,n,dir=1)=>{for(let i=0;i<n;i++)B(.07,.3+(i%3)*.05,.22,[0xe86a8a,0x5ec4b6,0xffc34d,0x8e6fd8,0x6ab04c][i%5],x+i*.09*dir,y+.15,z)};
 // shell
 B(8,.1,8,0xc98a55,0,0,0,0,false);B(8,.1,8,0xfff1de,0,3.2,0,0,false);
 [[8,3.2,.1,0,-4],[8,3.2,.1,0,4]].forEach(([w,h,d,x,z])=>B(w,h,d,0xfbe3c6,x,1.6,z,0,false));
 [-4,4].forEach(x=>B(.1,3.2,8,0xf7d9b6,x,1.6,0,0,false));
 M(new T.CircleGeometry(1.6,32),0xf08fb0,-.4,.06,.6,0,false).rotation.x=-Math.PI/2;
 // golden-hour windows (back wall)
 [-2.6,-.4].forEach(x=>{B(1.5,1.7,.08,0xe0884a,x,1.9,-3.93,0,false);P(1.3,1.5,tex((g,w,h)=>{const q=g.createLinearGradient(0,0,0,h);q.addColorStop(0,'#fff4c2');q.addColorStop(1,'#ffc46b');g.fillStyle=q;g.fillRect(0,0,w,h)}),x,1.9,-3.88,0,true)});
 // desk nook (back right) + pc + shelf
 B(2.4,.08,.9,0xe8c28f,2.4,.8,-3.5);B(.08,.8,.9,0xe8c28f,1.25,.4,-3.5);B(.08,.8,.9,0xe8c28f,3.55,.4,-3.5);col.push([1.2,3.6,-4,-3]);
 B(2.4,.08,.4,0xe8c28f,2.4,1.9,-3.75);B(.08,.7,.4,0xe8c28f,1.25,1.55,-3.75);books(1.5,1.94,-3.75,9);Sp(.16,0xff6fa5,3.3,2.12,-3.75);Sp(.1,0xff6fa5,3.3,2.34,-3.75);
 B(.75,.5,.05,0x222,2.4,1.1,-3.6);B(.08,.25,.08,0x222,2.4,.95,-3.6);
 const scr=P(.7,.4,tex((g,w,h)=>{g.fillStyle='#1d2b53';g.fillRect(0,0,w,h);g.fillStyle='#ffd1e3';g.font='bold 34px monospace';g.fillText('GAMES',70,80);g.fillStyle='#ffb347';g.fillRect(110,110,50,50);g.fillStyle='#fff';g.font='18px monospace';g.fillText('flappy.exe',80,200)}),2.4,1.1,-3.57,0,true);
 on(scr,"The PC — play a game",A.game);
 B(.25,.02,.1,0xffffff,2.0,.86,-3.2);Cy(.06,.1,0xfff,3.1,.9,-3.3);
 const lamp=Cy(.02,.5,0x333,1.5,1.1,-3.7);Sp(.12,0xffd070,1.5,1.4,-3.65);
 // purple chair
 Cy(.3,.1,0x7a3b8c,2.4,.55,-2.6);B(.5,.6,.08,0x7a3b8c,2.4,.95,-2.35);Cy(.04,.45,0x222,2.4,.28,-2.6);Cy(.28,.03,0x222,2.4,.03,-2.6);
 // low bookcase (left) + crates + record player
 const bc=B(.7,.9,2.1,0xa8683a,-3.6,.45,-2.0);col.push([-4,-3.2,-3.1,-.9]);books(-3.55,.9,-2.7,6);
 B(.5,.1,.6,0x333,-3.6,.95,-1.6);Cy(.2,.03,0x111,-3.6,1.02,-1.6);Sp(.04,0xff6fa5,-3.6,1.05,-1.6);
 B(.5,.35,.6,0x35c4b8,-3.5,1.15,-2.5);B(.5,.35,.6,0xff6fa5,-3.5,1.5,-2.5);
 on(bc,"The bookcase — projects",A.projects);
 // bed (left front)
 B(1.9,.45,3.1,0xb9783f,-2.9,.28,1.9);col.push([-3.85,-1.95,.35,3.45]);
 const bl=B(1.8,.25,2.6,0xfff3e6,-2.9,.62,2.1);on(bl,"The bed — about me",A.about);
 Sp(.38,0xffb3cf,-3.3,.85,.8).scale.set(1.3,.55,.9);Sp(.38,0xa6d8f0,-2.5,.85,.8).scale.set(1.3,.55,.9);
 // plush bear (pink)
 Sp(.22,0xff7fb0,-2.9,.95,1.5);Sp(.15,0xff7fb0,-2.9,1.22,1.5);Sp(.06,0xff7fb0,-3.02,1.35,1.5);Sp(.06,0xff7fb0,-2.78,1.35,1.5);
 // dresser (right) + globe + camera
 B(.9,1.2,2,0x6d9a58,3.5,.6,.8);col.push([3.05,4,-.2,1.8]);
 [.2,.55,.9].forEach(y=>{B(.04,.28,1.8,0x8fb878,3.04,y+.1,.8);Sp(.04,0x5a3a20,3.0,y+.1,.8)});
 const gl=Sp(.3,0x2f9ab8,3.5,1.65,1.1);Cy(.02,.3,0x555,3.5,1.35,1.1);on(gl,"The globe — find me online",A.contact);
 B(.25,.15,.15,0x222,3.5,1.28,.2);
 // posters + whiteboard (right wall)
 const pst=(t,c,z,y)=>P(.8,1.1,tex((g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='bold 38px sans-serif';g.textAlign='center';t.split(' ').forEach((s,i)=>g.fillText(s,w/2,90+i*48));g.strokeStyle='#fff';g.lineWidth=8;g.strokeRect(8,8,w-16,h-16)}),3.93,y,z,-Math.PI/2);
 pst('STAY CURIOUS','#e0485a',.3,2.2);pst('LOFI BEATS','#7a4fd0',1.3,2.2);
 B(.05,1.3,1.9,0xffffff,3.95,1.8,-1.7);
 const wb=P(1.8,1.2,tex((g,w,h)=>{g.fillStyle='#fffdf8';g.fillRect(0,0,w,h);g.fillStyle='#ff6fa5';g.font='bold 26px sans-serif';g.fillText('MY PAPER ★',20,40);g.strokeStyle='#4aa3df';g.lineWidth=4;g.beginPath();g.moveTo(30,200);g.bezierCurveTo(100,60,160,230,230,80);g.stroke();g.fillStyle='#ffe27a';g.fillRect(180,20,50,50);g.fillStyle='#333';g.font='14px sans-serif';g.fillText('click me!',185,50)}),3.9,1.8,-1.7,-Math.PI/2);
 on(wb,"The whiteboard — my paper",A.paper);
 // floor clutter (cute!)
 B(.3,.12,.18,0xff5a5a,.9,.13,1.4,.4);Cy(.04,.03,0x222,.8,.08,1.35);Cy(.04,.03,0x222,1.0,.08,1.45);
 [[0xe86a8a,1.7,.9],[0x5ec4b6,-1,1.9],[0xffc34d,.2,-1.6],[0x8e6fd8,1.9,2.4]].forEach(([c,x,z],i)=>B(.55,.1,.4,c,x,.12,z,i*1.3));
 B(.5,.4,.5,0xd9a05a,.3,.25,-2.4);B(.45,.08,.35,0x5ec4b6,.3,.5,-2.4);
 B(.45,.5,.45,0x4a8fd8,1.0,.28,-2.9);
 const bean=Sp(.55,0xffa6c9,-1.2,.35,3.1);bean.scale.y=.6;
 B(.5,.06,.5,0xe8c070,-1.2,.1,.2,.4);
 // fairy lights
 for(let i=0;i<26;i++){const m=new T.Mesh(new T.SphereGeometry(.05),new T.MeshBasicMaterial({color:[0xffd070,0xff8fb5,0xfff3b0][i%3]}));m.position.set(-3.8+i*.3,2.95-Math.sin(i/3.5)*.12,-3.88);S.add(m)}
 // sunlight + warm fill
 S.add(new T.AmbientLight(0xffd9b0,.7));
 const sun=new T.DirectionalLight(0xffc27a,1.3);sun.position.set(-1,3,-9);sun.target.position.set(0,0,2);S.add(sun,sun.target);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,far:25});
 const warm=new T.PointLight(0xffb070,.8,10);warm.position.set(0,2.8,1);S.add(warm);
 // dust motes in the sunbeams
 const pts=[];for(let i=0;i<90;i++)pts.push((Math.random()-.5)*7,.3+Math.random()*2.6,(Math.random()-.5)*7);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));
 const motes=new T.Points(g,new T.PointsMaterial({color:0xfff0c0,size:.04}));S.add(motes);
 return{col,motes}}
