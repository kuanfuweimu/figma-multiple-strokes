const TOOL_ID = '0c754988-b770-4362-a647-fb6200b9b94d';
const KEY = 'multiple-strokes-v1';
type Settings = {count:number; weight:number; gap:number; offset:number; color1:string; color2:string; colors?:string[]; positions?:number[]; interpolation?:string; mode:string; join:string};
let busy=false;
let stage='Ready';
function progress(message:string):void {stage=message;figma.ui.postMessage({type:'progress',message});}
function bounded(v:unknown,lo:number,hi:number):number {const n=Number(v);if(!Number.isFinite(n)||n<lo||n>hi)throw Error('Invalid value');return n;}
function english(v:string):string {return String(v).split(' / ').pop()!;}
function hex(v:string):string {const s=String(v).trim().replace(/^#/, '');return '#'+s.toUpperCase();}
function settings(v:Settings):Settings {
 const colors=(Array.isArray(v.colors)?v.colors:[v.color1,v.color2]).map(hex);
 if(colors.length<2||colors.length>12)throw Error('Use 2 to 12 colors');
 const positions=Array.isArray(v.positions)?v.positions.map(p=>bounded(p,0,100)):colors.map((_,i)=>100*i/(colors.length-1));
 if(positions.length!==colors.length)throw Error('Each color needs a ramp position');
 const interpolation=v.interpolation||'Linear';
 if(!['Linear','Smooth','Constant'].includes(interpolation))throw Error('Invalid ramp interpolation');
 const s={colors,positions,interpolation,count:Math.round(bounded(v.count,1,12)),weight:bounded(v.weight,0.5,80),gap:bounded(v.gap,0,80),offset:bounded(v.offset,0,80),color1:colors[0],color2:colors[1],mode:english(v.mode),join:english(v.join)};
 for(const c of colors)if(!/^#[0-9a-f]{6}$/i.test(c))throw Error('Choose a valid hex color');
 if(!['Single','Alternating','Gradient','Ramp'].includes(s.mode))throw Error('Invalid colour mode');
 if(!['Round','Miter','Bevel'].includes(s.join))throw Error('Invalid join');
 return s;
}
function rgb(hex:string):RGB {return {r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255};}
function sampleRamp(colors:string[],positions:number[],position:number,interpolation:string):RGB {
 const stops=colors.map((color,index)=>({color:rgb(color),position:positions[index],index})).sort((a,b)=>a.position-b.position||a.index-b.index);
 if(position<stops[0].position)return stops[0].color;
 let left=0;while(left+1<stops.length&&stops[left+1].position<=position)left++;
 if(left===stops.length-1||interpolation==='Constant')return stops[left].color;
 const a=stops[left],b=stops[left+1];
 let t=(position-a.position)/(b.position-a.position);
 if(interpolation==='Smooth')t=t*t*(3-2*t);
 return {r:a.color.r+(b.color.r-a.color.r)*t,g:a.color.g+(b.color.g-a.color.g)*t,b:a.color.b+(b.color.b-a.color.b)*t};
}
function layerColor(s:Settings,i:number):RGB {
 const colors=s.colors||[s.color1,s.color2];
 if(s.mode==='Single')return rgb(colors[0]);
 if(s.mode==='Alternating')return rgb(colors[i%colors.length]);
 if(s.mode==='Ramp')return sampleRamp(colors,s.positions||colors.map((_,j)=>100*j/(colors.length-1)),s.count===1?0:100*i/(s.count-1),s.interpolation||'Linear');
 const position=s.count===1?0:i/(s.count-1)*(colors.length-1);
 const left=Math.min(Math.floor(position),colors.length-2),t=position-left;
 const a=rgb(colors[left]),b=rgb(colors[left+1]);
 return {r:a.r+(b.r-a.r)*t,g:a.g+(b.g-a.g)*t,b:a.b+(b.b-a.b)*t};
}
function owned(n:SceneNode):boolean{return n.type==='FRAME'&&n.getPluginData(KEY)==='result';}
function sourceOf(n:SceneNode):SceneNode {
 if(owned(n)&&n.type==='FRAME'){const src=n.children.find(c=>c.getPluginData(KEY)==='source');if(!src)throw Error('Source layer is missing');return src;}
 return n;
}
function valid(n:SceneNode):boolean {return ['TEXT','VECTOR','BOOLEAN_OPERATION','RECTANGLE','ELLIPSE','POLYGON','STAR'].includes(n.type);}
function selection():SceneNode {
 const sel=figma.currentPage.selection;if(sel.length!==1)throw Error('Select one text layer, filled shape, or plugin result');
 const n=sel[0],src=sourceOf(n);if(!valid(src))throw Error('Select a text layer or filled vector, not a group or frame');
 if(!src.visible)throw Error('Source must be visible');
 if('fills'in src&&Array.isArray(src.fills)&&src.fills.some(p=>p.type==='IMAGE'||p.type==='VIDEO'))throw Error('Raster images are not supported');
 return n;
}
async function fonts(n:SceneNode):Promise<void> {
 const texts:TextNode[]=n.type==='TEXT'?[n]:('findAllWithCriteria'in n?n.findAllWithCriteria({types:['TEXT']}):[]);
 const seen=new Set<string>();
 for(const t of texts)for(const seg of t.getStyledTextSegments(['fontName'])){
  const font=seg.fontName,key=font.family+' / '+font.style;if(seen.has(key))continue;seen.add(key);
  progress('Loading font: '+key);
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([figma.loadFontAsync(font),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Font loading timed out: '+key)),15000);})]);}
  catch(e){throw Error('Cannot load font '+key+'. '+(e instanceof Error?e.message:String(e)));}
  finally{if(timer!==undefined)clearTimeout(timer);}
 }
}
function clean(v:VectorNode):void {v.fills=[{type:'SOLID',color:{r:0,g:0,b:0}}];v.strokes=[];v.effects=[];v.opacity=1;}
function expanded(base:VectorNode,d:number,parent:FrameNode,join:StrokeJoin):VectorNode {
 const body=base.clone();parent.appendChild(body);body.relativeTransform=base.relativeTransform;clean(body);
 if(d<=0)return body;
 const edge=base.clone();parent.appendChild(edge);edge.relativeTransform=base.relativeTransform;edge.fills=[];edge.effects=[];edge.strokes=[{type:'SOLID',color:{r:0,g:0,b:0}}];edge.strokeWeight=2*d;edge.strokeAlign='CENTER';edge.strokeJoin=join;
 const outline=edge.outlineStroke();edge.remove();if(!outline){body.remove();throw Error('Cannot outline this path');}
 parent.appendChild(outline);
 const combined=figma.union([body,outline],parent);
 const flat=figma.flatten([combined],parent);clean(flat);return flat;
}
async function build(source:SceneNode,s:Settings):Promise<FrameNode> {
 await fonts(source);const b=source.absoluteBoundingBox;if(!b||b.width<=0||b.height<=0)throw Error('Empty geometry');
 if(b.width>12000||b.height>12000)throw Error('Source must be smaller than 12000 px');
 const pad=s.offset+s.count*s.weight+(s.count-1)*s.gap+8;
 const out=figma.createFrame();out.name='Multiple strokes';out.fills=[];out.clipsContent=false;out.resize(b.width+pad*2,b.height+pad*2);
 out.x=b.x+b.width+80;out.y=b.y;
 try{
  const a=source.absoluteTransform;
  const src=source.clone();out.appendChild(src);src.relativeTransform=[[a[0][0],a[0][1],a[0][2]-b.x+pad],[a[1][0],a[1][1],a[1][2]-b.y+pad]];src.name='Source';
  progress('Converting source to vector paths…');
  const copy=src.clone();out.appendChild(copy);
  const base=figma.flatten([copy],out);clean(base);
  if(base.vectorPaths.reduce((sum,p)=>sum+p.data.length,0)>150000)throw Error('Path is too complex');
  if(!base.vectorPaths.length||!base.vectorPaths.every(p=>/[zZ]\s*$/.test(p.data.trim())))throw Error('Use a closed filled vector');
  const join:StrokeJoin=s.join==='Round'?'ROUND':s.join==='Bevel'?'BEVEL':'MITER';
  for(let i=s.count-1;i>=0;i--){
   progress('Building stroke '+(s.count-i)+' of '+s.count+'…');
   const inner=s.offset+i*(s.weight+s.gap),outer=inner+s.weight;
   const outerShape=expanded(base,outer,out,join),innerShape=expanded(base,inner,out,join);
   const band=figma.subtract([outerShape,innerShape],out);
   const ring=figma.flatten([band],out);ring.name='Stroke '+(i+1);ring.fills=[{type:'SOLID',color:layerColor(s,i)}];ring.strokes=[];ring.effects=[];
  }
  base.remove();out.appendChild(src);
  return out;
 }catch(e){out.remove();throw e;}
}
function report():void {
 if(busy)return;
 try{const n=selection();let saved:Settings|null=null;if(owned(n)){try{saved=settings(JSON.parse(n.getPluginData(KEY+'-settings')));}catch{}}
 figma.ui.postMessage({type:'selection',valid:true,update:owned(n),name:sourceOf(n).name,nodeId:n.id,nodeType:sourceOf(n).type,settings:saved});
 }catch(e){figma.ui.postMessage({type:'selection',valid:false,message:e instanceof Error?e.message:String(e)});}
}
figma.showUI(__html__,{width:300,height:540});

figma.on('selectionchange',report);
figma.ui.onmessage=async (m:{type:string;height?:number;settings?:Settings})=>{
 if(m.type==='resize'){try{if(Number.isFinite(m.height))figma.ui.resize(300,Math.max(160,Math.min(850,m.height!)));}catch(e){console.warn('Panel resize:',e);}return;}
 if(m.type==='ready'){figma.ui.postMessage({type:'connected'});report();return;}
 if(m.type==='selection'){report();return;}
 if(m.type!=='run'||busy)return;
 busy=true;stage='Validating selection';figma.ui.postMessage({type:'busy'});
 try{
  if(!m.settings)throw Error('Missing settings');const s=settings(m.settings),target=selection(),updating=owned(target),src=sourceOf(target);
  const out=await build(src,s);
  // Replacement is committed only after the complete new vector result exists.
  if(updating){const parent=target.parent;if(parent&&'appendChild'in parent){parent.insertChild(parent.children.indexOf(target),out);out.relativeTransform=target.relativeTransform;}out.name=target.name;}
  out.setPluginData(KEY,'result');out.setPluginData(KEY+'-settings',JSON.stringify(s));
  const source=out.children.find(n=>n.name==='Source');if(source)source.setPluginData(KEY,'source');
  out.setRelaunchData({[TOOL_ID]:'Edit multiple strokes'});
  if(updating)target.remove();
  figma.currentPage.selection=[out];figma.commitUndo();
  figma.viewport.scrollAndZoomIntoView([out]);
  figma.ui.postMessage({type:'success',message:s.count+' editable vector strokes '+(updating?'updated.':'created.')});
 }catch(e){figma.ui.postMessage({type:'error',message:stage+': '+(e instanceof Error?e.message:String(e))});}
 finally{busy=false;report();}
};

try{figma.root.setRelaunchData({[TOOL_ID]:'Multiple strokes'});}catch(e){console.warn('Relaunch registration:',e);}
report();
