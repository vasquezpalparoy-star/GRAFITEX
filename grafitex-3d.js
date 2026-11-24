import * as T from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
export function createStudio(host,getData){
const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;host.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.1,100),group=new T.Group();scene.add(group);camera.position.set(0,.05,6.5);camera.lookAt(0,0,0);
scene.add(new T.HemisphereLight(0xffffff,0x697080,1.5));for(const [x,y,z,i] of [[3,4,5,2.5],[-4,2,3,1.3],[0,4,-4,2.2]]){const l=new T.DirectionalLight(0xffffff,i);l.position.set(x,y,z);scene.add(l)}
const cloth=document.createElement('canvas');cloth.width=cloth.height=128;const cc=cloth.getContext('2d');cc.fillStyle='#888';cc.fillRect(0,0,128,128);for(let i=0;i<128;i+=4){cc.fillStyle='#aaa';cc.fillRect(i,0,1,128);cc.fillStyle='#666';cc.fillRect(0,i,128,1)}const bump=new T.CanvasTexture(cloth);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.set(12,12);
const faces=['front','back','left','right'],textures={},canvases={};for(const face of faces){const c=document.createElement('canvas');c.width=1200;c.height=1300;canvases[face]=c;const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures[face]=tex}
function mat(color,map=null){return new T.MeshStandardMaterial({color,map,roughness:.92,metalness:0,bumpMap:bump,bumpScale:.012,side:T.DoubleSide})}
const front=mat(0xffffff,textures.front),back=mat(0xffffff,textures.back),left=mat(0xffffff,textures.left),right=mat(0xffffff,textures.right),body=mat(0xffffff),sleeve=mat(0xffffff),neck=mat(0xffffff);
// Continuous tailored torso, with independent front/back UVs and closed side seams.
const garment=new T.Group();group.add(garment);let lastModel='';
function rebuild(model){
for(const m of [...garment.children]){garment.remove(m);m.geometry.dispose()}
const rows=80,cols=96;
function ring(t,theta){
let w=.56+.12*Math.exp(-Math.pow((t-.26)/.22,2))-.075*Math.exp(-Math.pow((t-.64)/.22,2))+.025*t;
let d=.19+.095*Math.sin(Math.PI*t);
let f=.008*Math.sin(theta*11+t*31)+.013*Math.sin(theta*5-t*17)*Math.sin(Math.PI*t);
let x=Math.sin(theta)*(w+f),z=Math.cos(theta)*(d+f);
let top=1.10-.19*Math.abs(Math.sin(theta))-.13*Math.pow(Math.abs(Math.cos(theta)),5);
if(model==='v'&&Math.cos(theta)>0)top-=.16*Math.pow(Math.cos(theta),10);
return [x,top*(1-t)-1.05*t,z];
}
for(const [side,material] of [[0,front],[1,back]]){
let v=[],uv=[],idx=[];
for(let j=0;j<=rows;j++){let t=j/rows;for(let i=0;i<=cols;i++){let u=i/cols,theta=(u-.5)*Math.PI+side*Math.PI;v.push(...ring(t,theta));uv.push((150+300*u)/600,1-(110+455*t)/650)}}
for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){let k=j*(cols+1)+i,n=k+cols+1;idx.push(k,n,k+1,k+1,n,n+1)}
let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();garment.add(new T.Mesh(g,material));
}
for(const sign of [-1,1]){
let length=model==='long'?1.22:.61,axis=new T.Vector3(sign*.83,-.56,0).normalize(),start=new T.Vector3(sign*.48,.79,0),end=start.clone().addScaledVector(axis,length);
let v=[],uv=[],idx=[],N=64,M=32;for(let j=0;j<=M;j++){let t=j/M,center=start.clone().lerp(end,t),r=.285-.065*t;for(let i=0;i<=N;i++){let u=i/N,angle=u*Math.PI*2,fold=.008*Math.sin(angle*8+t*17);let p=center.clone().addScaledVector(new T.Vector3(-axis.y,axis.x,0),Math.cos(angle)*(r+fold)).addScaledVector(new T.Vector3(0,0,1),Math.sin(angle)*(r+fold)*.92);v.push(p.x,p.y,p.z);uv.push((140+330*u)/600,1-(145+350*t)/650)}}
for(let j=0;j<M;j++)for(let i=0;i<N;i++){let k=j*(N+1)+i,n=k+N+1;idx.push(k,n,k+1,k+1,n,n+1)}
let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();garment.add(new T.Mesh(g,sign<0?left:right));
let cuff=new T.Mesh(new T.TorusGeometry(.22,.015,12,64),neck);cuff.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),axis);cuff.position.copy(end);garment.add(cuff);
}
for(const t of [0,1]){let pts=[];for(let i=0;i<=96;i++)pts.push(new T.Vector3(...ring(t,i/96*Math.PI*2)));let curve=new T.CatmullRomCurve3(pts.slice(0,-1),true);garment.add(new T.Mesh(new T.TubeGeometry(curve,128,t===0?.025:.012,10,true),t===0?neck:body))}
}
let running=false,frame=0,down=false,lastX=0,lastY=0;group.rotation.y=.25;function resize(){let w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}const obs=new ResizeObserver(resize);obs.observe(host);
renderer.domElement.addEventListener('pointerdown',e=>{down=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!down)return;group.rotation.y+=(e.clientX-lastX)*.012;group.rotation.x=Math.max(-.65,Math.min(.65,group.rotation.x+(e.clientY-lastY)*.008));lastX=e.clientX;lastY=e.clientY});for(const event of ['pointerup','pointercancel'])renderer.domElement.addEventListener(event,()=>down=false);renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=Math.max(3.4,Math.min(8,camera.position.z+e.deltaY*.004))},{passive:false});
function tick(){if(!running)return;renderer.render(scene,camera);frame=requestAnimationFrame(tick)}
return {update(){const data=getData();if(lastModel!==data.state.model){lastModel=data.state.model;rebuild(lastModel)}neck.color.set(data.state.neck);body.color.set(data.state.body);sleeve.color.set(data.state.sleeve);for(const face of faces){let c=canvases[face],x=c.getContext('2d');x.fillStyle=face==='left'||face==='right'?data.state.sleeve:data.state.body;x.fillRect(0,0,1200,1300);x.save();x.scale(2,2);data.renderFace(face,x);x.restore();textures[face].needsUpdate=true}},resume(){if(running)return;running=true;resize();tick()},pause(){running=false;cancelAnimationFrame(frame)}}
}