const e=e=>document.getElementById(e),t=e("presenter-console"),n=e("presenter-workspace"),r=new URL(location.href).searchParams,i=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+"-"+Math.random().toString(36).slice(2),s=location.origin+location.pathname,o="hit-presenter-v1",a=o+":window-session:"+s,c=history.state?.[o],l=c?.deckKey===s?c:null;
let u=["presenter","audience"].includes(r.get("role"))?r.get("role"):!r.has("role")&&["presenter","audience"].includes(l?.role)?l.role:"deck";
function d(){
  if("string"==typeof l?.session&&l.session)return l.session;
  const e=/^hit-(?:deck|presenter|audience)-([a-zA-Z0-9-]+)$/.exec(window.name);
  if(e)return e[1];
  if("audience"===u)try{
    return sessionStorage.getItem(a)}
  catch{
    }
  return null}
const p=r.get("hit-session")||d()||i(),f=i();
function h(){
  try{
    sessionStorage.setItem(a,p)}
  catch{
    }
  try{
    window.name="hit-"+u+"-"+p}
  catch{
    }
  }
const m=o+":"+s+":"+p,g=o+":settings:"+s,w=m+":state",v="file:"===location.protocol||"null"===location.origin?"*":location.origin;
let y,b="boolean"==typeof l?.popup?l.popup:"deck"!==u&&!!window.opener,x="deck"!==u?window.opener:null,E=!1,k=!1,S=0,I=0,N=0,C=null,M=0,L=null,$=0,F=null,T=!1,A=null,O=null,q="auto",z=null,D=!1,G=!1,P=!1,R=!1,H=null,U=!1,W=null,Y=null,B=0,K=null,X="",j=null,J=null,V="";
const Z=new Set;
let _=0,Q=null,ee=!1,te=null,ne=19;
const re=new Set,ie=[...n.querySelectorAll(".p-card")];
function se(e){
  try{
    return JSON.parse(localStorage.getItem(e))}
  catch{
    return null}
  }
function oe(e,t){
  try{
    localStorage.setItem(e,JSON.stringify(t))}
  catch{
    }
  }
const ae=se(g);
function ce(){
  oe(g,{
    fontSize:ne,layout:te}
  )}
function le(){
  const e=/^#\/(\d+)$/.exec(location.hash);
  return e?Number(e[1]):0}
function ue(){
  if("presenter"===u)return void De();
  const e=Math.max(0,Math.min(innerWidth/CONFIG.width,innerHeight/CONFIG.height));
  stage.style.transform=`translate(${(innerWidth-CONFIG.width*e)/2}px,${(innerHeight-CONFIG.height*e)/2}px) scale(${e})`}
function updateContentsCurrent(){
  const section=Number(slides[I].dataset.section);
  if(section<0)return;
  stage.querySelectorAll(".contents-item").forEach(item=>item.setAttribute("aria-current",String(Number(item.dataset.sectionIndex)===section)))}
function de(t,n=!0,r=!0,i=!0){
  const s=Math.max(0,Math.min(Number.isFinite(t)?Math.floor(t):0,slides.length-1));
  s!==I&&i&&($=0,F=null===L?null:Date.now()),I=s,window.dispatchEvent(new Event("hit-slidechange")),updateContentsCurrent(),document.activeElement?.closest("#stage .slide")!==slides[I]&&document.activeElement?.closest("#stage .slide")&&document.activeElement.blur(),slides.forEach((e,t)=>{
    const n=t===I;
    e.classList.toggle("active",n),e.setAttribute("aria-hidden",String(!n)),e.inert=!n}
  ),e("counter").textContent=`${I+1} / ${slides.length}`,e("prev").disabled=0===I,e("next").disabled=I===slides.length-1,e("announcement").textContent=`第 ${I+1} 页，共 ${slides.length} 页，${slides[I].getAttribute("aria-label")}`,"presenter"===u&&Ge(),xe(),n&&location.hash!=="#/"+I&&history.replaceState(history.state,"","#/"+I),r&&("presenter"===u?$e():"audience"===u&&Le("navigate",{
    index:I}
  )),Ce()}
function pe(e){
  de(I+e)}
function fe(){
  "presenter"!==u&&(document.body.classList.add("controls-visible"),clearTimeout(y),y=setTimeout(()=>document.body.classList.remove("controls-visible"),1700))}
function he(e){
  return slides[e]?.querySelector("h1,h2")?.textContent.trim()||slides[e]?.getAttribute("aria-label")||`第 ${e+1} 页`}
function me(e){
  return NOTES[e]||{
    text:"在此填写本页讲稿。请在 NOTES 中添加对应条目。",source:"",references:[]}
  }
function ge(e){
  const t=Number(NOTES[e]?.seconds);
  return Number.isFinite(t)&&t>0?t:0}
function we(){
  return slides.reduce((e,t,n)=>e+ge(n),0)}
function ve(e){
  return`${Math.floor(e/60).toString().padStart(2,"0")}:${Math.floor(e%60).toString().padStart(2,"0")}`}
function ye(e){
  return`${Math.floor(e/3600).toString().padStart(2,"0")}:${Math.floor(e/60%60).toString().padStart(2,"0")}:${Math.floor(e%60).toString().padStart(2,"0")}`}
function be(e,t){
  e.replaceChildren(),String(t||"本页尚未填写讲稿。").split(/\n\s*\n/).forEach(t=>{
    const n=document.createElement("p"),r=/^【([^】]+)】/.exec(t);
    if(r){
      const e=document.createElement("strong");
      e.textContent=r[1],n.append(e,document.createTextNode(t.slice(r[0].length)))}
    else n.textContent=t;
    e.append(n)}
  )}
function xe(){
  const t=Date.now(),n=(M+(null===L?0:Math.max(0,t-L)))/1e3,r=($+(null===F?0:Math.max(0,t-F)))/1e3,i=we()>0&&n>we();
  e("presenter-elapsed").textContent=ye(n),e("presenter-elapsed").classList.toggle("over-budget",i),e("presenter-clock").textContent=(new Date).toLocaleTimeString("zh-CN",{
    hour12:!1}
  ),e("presenter-page-time").textContent=`本页已用 ${ve(r)}${ge(I)?" / "+ve(ge(I)):""}`,e("presenter-page-time").classList.toggle("over-budget",ge(I)>0&&r>ge(I));
  const s=null!==L?"暂停":M>0?"继续":"开始计时";
  e("presenter-timer-toggle").textContent=s}
function Ee(){
  null===L&&(L=Date.now(),F=L,T=!1,xe(),$e(),Ce())}
function ke(){
  if(T=!1,null===L)Ee();
  else{
    const e=Date.now();
    M+=Math.max(0,e-L),$+=null===F?0:Math.max(0,e-F),L=null,F=null,xe(),$e(),Ce()}
  }
function Se(){
  M=0,L=null,$=0,F=null,T=!1,xe(),$e(),Ce()}
function Ie(){
  return{
    index:I,elapsedMs:M,timerStart:L,pageElapsedMs:$,pageTimerStart:F,autoTimerPending:T}
  }
function Ne(e){
  if(e&&Number.isFinite(e.index)){
    for(const t of["elapsedMs","pageElapsedMs"])if(!Number.isFinite(e[t])||e[t]<0)return;
    for(const t of["timerStart","pageTimerStart"])if(null!==e[t]&&!Number.isFinite(e[t]))return;
    M=e.elapsedMs,L=e.timerStart,$=e.pageElapsedMs,F=e.pageTimerStart,T=!!e.autoTimerPending,de(e.index,!0,!1,!1)}
  }
function Ce(){
  "presenter"===u&&oe(w,Ie())}
function Me(e,t={
  }
){
  return{
    namespace:o,deckKey:s,session:p,sender:f,id:f+":"+ ++_,role:u,type:e,...t}
  }
function Le(e,t={
  }
){
  if("deck"===u)return;
  const n=Me(e,t);
  try{
    Q?.postMessage(n)}
  catch{
    }
  try{
    x&&!x.closed&&x.postMessage(n,v)}
  catch{
    }
  try{
    localStorage.setItem(m,JSON.stringify(n))}
  catch{
    }
  }
function $e(){
  "presenter"===u&&Le("state",{
    state:Ie()}
  )}
function Fe(e){
  return e&&e.namespace===o&&e.deckKey===s&&e.session===p&&e.sender!==f&&"string"==typeof e.id&&"string"==typeof e.type}
function Te(t){
  k=t,e("presenter-status").classList.toggle("connected",t),e("presenter-status").textContent=t?U?"播放窗已连接 · 全屏放映":"播放窗已连接 · 同步放映":"播放窗未连接",yt()}
function Ae(){
  return{
    x:window.screenX,y:window.screenY,width:window.outerWidth,height:window.outerHeight}
  }
function Oe(){
  "audience"===u&&Le("geometry",{
    geometry:Ae(),fullscreen:!!document.fullscreenElement}
  )}
function qe(e){
  if(!Fe(e)||re.has(e.id)||"deck"===u)return;
  if("presenter"===u&&"audience"===e.role){
    if(Z.has(e.sender))return;
    "closing"!==e.type&&(j=e.sender)}
  re.add(e.id),re.size>240&&re.delete(re.values().next().value);
  const t=k;
  switch(S=Date.now(),u!==e.role&&Te(!0),e.type){
    case"ready":case"heartbeat":if(J)break;
    "presenter"===u&&"audience"===e.role&&(U=!!e.fullscreen,H=e.geometry||H,Te(!0),"ready"!==e.type&&t||($e(),P||at()),U&&T&&Ee());
    break;
    case"navigate":"presenter"===u&&Number.isFinite(e.index)&&de(e.index);
    break;
    case"state":"audience"===u&&Ne(e.state);
    break;
    case"geometry":"presenter"===u&&(H=e.geometry||null,U=!!e.fullscreen,Te(!0),ct());
    break;
    case"fullscreen":"presenter"===u&&(U=!!e.fullscreen,U?ht(!0):(Te(!0),ct()));
    break;
    case"place":"audience"!==u||J&&"commit"!==J.phase||pt(e.box,!!e.fullscreen,e.requestId);
    break;
    case"placement-ready":"presenter"===u&&K?.id===e.requestId&&(H=e.geometry||H,K.placement?.(!!e.placed));
    break;
    case"fullscreen-request":"audience"!==u||J&&"commit"!==J.phase||(ut(e.box)&&(tt(),z=e.box),fe(),ft(!0).then(t=>Le("fullscreen-result",{
      requestId:e.id,fullscreen:t}
    )));
    break;
    case"fullscreen-result":"presenter"===u&&K?.id===e.requestId&&ht(!!e.fullscreen);
    break;
    case"web-swap-begin":"presenter"===u&&!J&&xt(e.swapId,"web",e.sender);
    break;
    case"web-swap":"audience"===u&&webSwapAudience(e);
    break;
    case"web-swap-result":"presenter"===u&&webSwapComplete(e);
    break;
    case"web-swap-done":"audience"===u&&J?.id===e.swapId&&(bt(),Oe());
    break;
    case"swap-request":"presenter"===u&&kt(e.swapId,e.sender,!!e.fullscreen);
    break;
    case"swap-prepare":"audience"===u&&"presenter"===e.role&&St(e);
    break;
    case"swap-ready":"presenter"===u&&J?.id===e.swapId&&"prepare"===J.phase&&It(!!e.fullscreen);
    break;
    case"swap-commit":V===e.swapId?Le("swap-done",{
      swapId:e.swapId}
    ):"audience"===u&&"presenter"===e.role&&J?.id===e.swapId&&Nt(e);
    break;
    case"swap-done":if("audience"===u&&J?.id===e.swapId&&"commit"===J.phase){
      const e=J;
      bt(),Oe(),e.fullscreen&&e.initiator===f&&ft().then(e=>Le("swap-fullscreen-result",{
        fullscreen:e}
      ))}
    break;
    case"swap-fullscreen-result":"presenter"!==u||e.fullscreen||Ke("已换屏；浏览器未允许自动全屏，请点击「副屏全屏」继续。");
    break;
    case"swap-abort":J?.id===e.swapId&&(bt(),"presenter"===u&&Ke("换屏未完成，请检查播放窗口后重试。"));
    break;
    case"end":if(bt(),vt("deck"),Te(!1),x=null,b)try{
      window.close()}
    catch{
      }
    break;
    case"closing":"audience"===u&&"commit"===J?.phase&&vt("presenter"),bt(),Te(!1),"presenter"===u&&Ke("播放窗口已断开，可点击「打开播放窗」继续。")}
  }
ae&&"object"==typeof ae&&(Number.isFinite(ae.fontSize)&&(ne=Math.max(14,Math.min(34,ae.fontSize))),ae.layout&&"object"==typeof ae.layout&&(te=ae.layout)),slides.forEach((t,n)=>{
  t.prepend(e("brand-header").content.cloneNode(!0)),t.append(e("brand-footer").content.cloneNode(!0)),t.querySelector(".page-number").textContent=String(n+1);
  const r=Number(t.dataset.section);
  CONFIG.sections.forEach((e,n)=>{
    const i=document.createElement("button");
    i.type="button",i.className="chapter-link",i.textContent=e.title,i.dataset.target=e.page-1,i.setAttribute("aria-current",String(n===r)),t.querySelector(".chapter-nav").append(i)}
  )}
),document.querySelectorAll("[data-chapter-name]").forEach(e=>{
  const t=CONFIG.sections[Number(e.dataset.chapterName)];
  t&&(e.textContent=t.title)}
),CONFIG.sections.forEach((t,n)=>{
  const r=document.createElement("a");
  r.className="contents-item",r.href="#/"+(t.page-1),r.dataset.target=t.page-1,r.dataset.sectionIndex=n,r.setAttribute("aria-current",String(n===0)),[["contents-index",String(n+1).padStart(2,"0")],["contents-separator","|"],["contents-name",t.title]].forEach(([e,t])=>{
    const n=document.createElement("span");
    n.className=e,n.textContent=t,"contents-separator"===e&&n.setAttribute("aria-hidden","true"),r.append(n)}
  ),e("contents").append(r)}
);
try{
  Q=new BroadcastChannel(m),Q.onmessage=e=>qe(e.data)}
catch{
  }
function ze(e,t,n){
  if(e.dataset.index===String(t))return;
  e.dataset.index=String(t);
  const r=slides[t].cloneNode(!0),i=new Map;
  for(const e of[r,...r.querySelectorAll("[id]")])if(e.id){
    const t=e.id;
    e.id=n+"-"+t,i.set(t,e.id)}
  for(const e of[r,...r.querySelectorAll("*")])for(const t of[...e.attributes]){
    let n=t.value.replace(/url\(#([^)]*)\)/g,(e,t)=>i.has(t)?"url(#"+i.get(t)+")":e);
    ("href"===t.name||"xlink:href"===t.name)&&n.startsWith("#")&&i.has(n.slice(1))&&(n="#"+i.get(n.slice(1))),"aria-labelledby"!==t.name&&"aria-describedby"!==t.name||(n=n.split(" ").map(e=>i.get(e)||e).join(" ")),n!==t.value&&e.setAttribute(t.name,n)}
  r.classList.add("active"),r.inert=!0,r.setAttribute("aria-hidden","true"),e.replaceChildren(r)}
function De(){
  if("presenter"===u)for(const t of["current","next"]){
    const n=e("preview-"+t),r=e("preview-"+t+"-stage"),i=n.clientWidth,s=n.clientHeight,o=Math.min(i/CONFIG.width,s/CONFIG.height);
    r.style.transform=`translate(${(i-CONFIG.width*o)/2}px,${(s-CONFIG.height*o)/2}px) scale(${o})`}
  }
function Ge(){
  const t=me(I),n=I===slides.length-1;
  ze(e("preview-current-stage"),I,"hit-current"),ze(e("preview-next-stage"),Math.min(I+1,slides.length-1),"hit-next"),e("presenter-current-label").textContent=`${I+1} / ${slides.length}`,e("presenter-next-label").textContent=n?"放映结束":`第 ${I+2} 页 · 点击翻页`,e("presenter-end").hidden=!n,e("preview-next").disabled=n,e("presenter-counter").textContent=`${I+1} / ${slides.length}`,e("presenter-prev").disabled=0===I,e("presenter-next").disabled=n,e("presenter-slide").value=String(I),e("presenter-progress").max=slides.length,e("presenter-progress").value=I+1,e("presenter-total-budget").textContent=we()?"总预算 "+ve(we()):"总预算未设置";
  const r=e("presenter-script");
  be(r,t.text);
  const i=document.createElement("div");
  if(i.className="p-note-title",i.textContent=`${String(I+1).padStart(2,"0")} / ${he(I)}`,r.prepend(i),t.source){
    const e=document.createElement("p");
    e.className="p-note-source",e.textContent=t.source,r.append(e)}
  if(Array.isArray(t.references)&&t.references.length){
    const e=document.createElement("details"),n=document.createElement("summary");
    n.textContent="本页引用文献",e.append(n),t.references.forEach(t=>{
      const n=document.createElement("p");
      n.textContent=t,e.append(n)}
    ),r.append(e)}
  r.scrollTop=0,r.style.setProperty("--p-note-size",ne+"px"),e("presenter-words").textContent=`讲稿 ${Array.from(String(t.text||"").replace(/\s/g,"")).length} 字`,e("presenter-page-budget").textContent=ge(I)?"本页建议 "+ge(I)+" 秒":"本页未设时长",De()}
function Pe(){
  if(ee)return;
  ee=!0;
  const t=slides[0].querySelector(".cover-brand svg")?.cloneNode(!0);
  if(t&&(t.removeAttribute("id"),e("presenter-brand").append(t)),slides.forEach((t,n)=>{
    const r=document.createElement("option");
    r.value=String(n),r.textContent=`第 ${n+1} 页 · ${he(n)}`,e("presenter-slide").append(r)}
  ),Be(),"ResizeObserver"in window){
    const t=new ResizeObserver(()=>De());
    t.observe(e("preview-current")),t.observe(e("preview-next")),new ResizeObserver(()=>We()).observe(n)}
  }
function Re(){
  return innerWidth>900&&innerHeight>640}
window.addEventListener("message",e=>{
  e.origin!==location.origin&&("file:"!==location.protocol||"null"!==e.origin&&"file://"!==e.origin)||Fe(e.data)&&(x&&!x.closed&&e.source!==x&&e.source!==window.opener||(e.source&&(x=e.source),qe(e.data)))}
),window.addEventListener("storage",e=>{
  if(e.key===m&&e.newValue)try{
    qe(JSON.parse(e.newValue))}
  catch{
    }
  }
);
const He={
  current:{
    x:0,y:0,w:.61,h:.64}
  ,next:{
    x:.625,y:0,w:.375,h:.37}
  ,script:{
    x:.625,y:.39,w:.375,h:.61}
  ,timer:{
    x:0,y:.66,w:.61,h:.34}
  }
,Ue=(e,t,n)=>Math.max(t,Math.min(e,n));
function We(){
  if("presenter"!==u)return;
  if(!Re())return void De();
  const{
    width:e,height:t}
  =n.getBoundingClientRect();
  ie.forEach(n=>{
    let r=te?.[n.dataset.card]||He[n.dataset.card];
    r&&["x","y","w","h"].every(e=>Number.isFinite(r[e]))||(r=He[n.dataset.card]);
    const i=Ue(r.w*e,Math.min(230,e),e),s=Ue(r.h*t,Math.min(150,t),t);
    Object.assign(n.style,{
      left:Ue(r.x*e,0,e-i)+"px",top:Ue(r.y*t,0,t-s)+"px",width:i+"px",height:s+"px"}
    )}
  ),De()}
function Ye(){
  const e=n.getBoundingClientRect();
  e.width&&e.height&&(te={
    }
  ,ie.forEach(t=>{
    const n=t.getBoundingClientRect();
    te[t.dataset.card]={
      x:(n.left-e.left)/e.width,y:(n.top-e.top)/e.height,w:n.width/e.width,h:n.height/e.height}
    }
  ),ce())}
function Be(){
  ie.forEach(e=>{
    for(const[t,r]of[[".p-card-head",!1],[".p-resize",!0]]){
      const i=e.querySelector(t);
      i.addEventListener("pointerdown",t=>{
        if(!Re()||0!==t.button||t.target.closest("button,select,a"))return;
        t.preventDefault(),i.setPointerCapture(t.pointerId);
        const s=n.getBoundingClientRect(),o=e.getBoundingClientRect(),a=o.left-s.left,c=o.top-s.top,l=t.clientX,u=t.clientY;
        function d(n){
          if(n.pointerId!==t.pointerId)return;
          const i=n.clientX-l,d=n.clientY-u;
          r?(e.style.width=Ue(o.width+i,230,s.width-a)+"px",e.style.height=Ue(o.height+d,150,s.height-c)+"px"):(e.style.left=Ue(a+i,0,s.width-o.width)+"px",e.style.top=Ue(c+d,0,s.height-o.height)+"px"),De()}
        function p(n){
          n.pointerId===t.pointerId&&(e.classList.remove("resizing","dragging"),i.removeEventListener("pointermove",d),i.removeEventListener("pointerup",p),i.removeEventListener("pointercancel",p),Ye())}
        e.classList.add(r?"resizing":"dragging"),i.addEventListener("pointermove",d),i.addEventListener("pointerup",p),i.addEventListener("pointercancel",p)}
      )}
    }
  )}
function Ke(t){
  e("presenter-notice").textContent=t}
function Xe(e){
  return[e.availLeft??e.left??0,e.availTop??e.top??0,e.availWidth??e.width,e.availHeight??e.height].join(":")}
function je(){
  const t=e("presenter-screen");
  t.replaceChildren(new Option("自动选择副屏","auto")),A&&Array.from(A.screens).forEach((e,n)=>{
    t.append(new Option((e.label||"屏幕 "+(n+1))+(e===A.currentScreen?" · 当前窗口所在屏":""),Xe(e)))}
  ),Array.from(t.options).some(e=>e.value===q)||(q="auto"),t.value=q}
function Je(){
  return A?Promise.resolve(A):O||("function"==typeof window.getScreenDetails&&window.isSecureContext?(O=window.getScreenDetails().then(e=>(D=!1,A=e,je(),e.addEventListener?.("screenschange",()=>{
    je(),"presenter"===u&&(W=null,at(),ct())}
  ),e.addEventListener?.("currentscreenchange",()=>je()),e)).catch(()=>(D=!0,null)).finally(()=>{
    O=null}
  ),O):(D=!0,Promise.resolve(null)))}
function Ve(){
  if(!A?.screens?.length)return null;
  const e=Array.from(A.screens);
  if("auto"!==q){
    const t=e.find(e=>Xe(e)===q);
    if(t)return t}
  if(W){
    const t=e.find(e=>Xe(e)===W);
    if(t)return t}
  const t=A.currentScreen;
  return e.find(e=>Xe(e)!==Xe(t||window.screen))||t||e[0]}
function Ze(e){
  return e?{
    left:Number(e.availLeft??e.left??0),top:Number(e.availTop??e.top??0),width:Number(e.availWidth||e.width||1280),height:Number(e.availHeight||e.height||800),label:e.label||"所选屏幕"}
  :null}
function _e(e){
  const t=Ze(e||window.screen),n=Math.min(t.width,Math.max(400,Math.floor(.9*t.width))),r=Math.min(t.height,Math.max(300,Math.floor(.88*t.height)));
  return{
    left:Math.round(t.left+(t.width-n)/2),top:Math.round(t.top+(t.height-r)/2),width:n,height:r,label:t.label,screenLeft:t.left,screenTop:t.top,screenWidth:t.width,screenHeight:t.height}
  }
function Qe(e,t){
  if(!ut(e)||!t||![t.x,t.y,t.width,t.height].every(Number.isFinite))return!1;
  const n=e.screenLeft??e.left,r=e.screenTop??e.top,i=e.screenWidth??e.width,s=e.screenHeight??e.height,o=t.x+t.width/2,a=t.y+t.height/2;
  return o>=n&&o<n+i&&a>=r&&a<r+s}
function et(e,t){
  if(e&&ut(t)){
    try{
      e.resizeTo(t.width,t.height)}
    catch{
      }
    try{
      e.moveTo(t.left,t.top)}
    catch{
      }
    }
  }
function tt(){
  B++,clearTimeout(Y),Y=null}
function nt(t="audience"){
  const e=new URL(location.href);
  return e.searchParams.delete("hit-session"),e.searchParams.set("role",t),e.hash="/"+I,e.href}
function rt(e){
  const t=e.document;
  t.open(),e.history.replaceState(null,"",nt()),t.write(fileAudienceMarkup),t.close()}
function it(){
  j&&(Z.add(j),Z.size>64&&Z.delete(Z.values().next().value)),j=null}
function st(e){
  try{
    if(e.document.getElementById("stage"))return!0}
  catch{
    }
  if(b&&!E)return null;
  const t=H,n=Ve()?_e(Ve()):t&&[t.x,t.y,t.width,t.height].every(Number.isFinite)&&t.width>0&&t.height>0?{
    left:t.x,top:t.y,width:t.width,height:t.height}
  :_e(null),r=window.open("about:blank","_blank",`popup=yes,left=${n.left},top=${n.top},width=${n.width},height=${n.height}`);
  if(!r)throw new Error("播放窗口被拦截");
  r.name="hit-audience-"+p,it(),x=r,E=!0,b&&(b=!1,wt(u)),U=!1,Te(!1),rt(r),et(r,n);
  try{
    e.close()}
  catch{
    }
  try{
    window.focus()}
  catch{
    }
  return!1}
async function openWebPresenter(screen,box){
  if("https:"!==location.protocol||b||x&&!x.closed||!screen||!A||A.screens.length<2||screen===A.currentScreen||!document.documentElement.requestFullscreen)return!1;
  if(!navigator.userActivation?.isActive)return R=!1,Ke("屏幕权限已就绪，请点击「打开播放窗」开始双屏全屏放映。"),!0;
  const home=_e(A.currentScreen),here=Ae();
  Qe(home,here)&&(home.left=here.x,home.top=here.y,home.width=Math.min(here.width,home.screenWidth),home.height=Math.min(here.height,home.screenHeight));
  Ce(),it(),R=!1,z=box,vt("audience");
  try{
    await document.documentElement.requestFullscreen({
      screen,navigationUI:"hide"}
    );
    if("audience"!==u)return!0;
    x=window.open(nt("presenter"),"hit-presenter-"+p,`popup=yes,left=${home.left},top=${home.top},width=${home.width},height=${home.height}`);
    if(!x)throw new Error("Popup blocked");
    E=!0,U=!1,Te(!1);
    try{
      x.focus()}
    catch{
      }
    Le("ready",{
      geometry:Ae(),fullscreen:!!document.fullscreenElement}
    );
    return!0}
  catch{
    if(document.fullscreenElement)try{
      await document.exitFullscreen()}
    catch{
      }
    return z=null,vt("presenter"),Ke("浏览器未完成双屏全屏放映，请允许弹窗后点击「打开播放窗」重试。"),!0}
  }
async function ot(){
  if("presenter"!==u||G)return;
  G=!0,P=!0,R=!0,K?.placement?.(!1),K?.timer&&clearTimeout(K.timer),K=null,X="",e("presenter-fullscreen").disabled=!1;
  const t=e("presenter-open");
  t.disabled=!0,t.textContent="等待屏幕权限",Ke("请先处理浏览器的屏幕权限询问，随后打开播放窗口。");
  try{
    if(await Je(),"presenter"!==u)return;
    const e=Ve();
    e||(R=!1),W=e?Xe(e):null;
    const t=_e(e);
    if(await openWebPresenter(e,t))return;
    if(x&&!x.closed||(it(),x=window.open(fileAudienceMarkup?"about:blank":nt(),"hit-audience-"+p,`popup=yes,left=${t.left},top=${t.top},width=${t.width},height=${t.height}`),E=!!x,E&&b&&(b=!1,wt(u)),Te(!1),x&&fileAudienceMarkup&&rt(x)),!x)return R=!1,void Ke("屏幕权限询问已结束。浏览器拦截了播放窗口，请点击「打开播放窗」继续。");
    et(x,t);
    try{
      x.focus()}
    catch{
      }
    P=!1,ct(),k&&at();
    try{
      window.focus()}
    catch{
      }
    }
  finally{
    P=!1,G=!1,t.disabled=!1,t.textContent="打开播放窗"}
  }
function at(){
  if("presenter"!==u||!k||P||"web"===J?.phase)return;
  const e=Ve(),t=e?_e(e):null;
  e&&"auto"===q&&(W=Xe(e)),U||webSwapEligible()||et(x,t),Le("place",{
    box:t,fullscreen:R}
  ),R=!1}
function ct(){
  if("presenter"!==u)return;
  if(X)return void Ke(X);
  if("file:"===location.protocol&&!A&&D&&(!1!==window.screen.isExtended||"function"==typeof window.getScreenDetails))return void Ke("本地文件未取得屏幕管理权限，无法自动定位副屏。请使用本地启动包中的 HIT-HTML-local.cmd 后重新授权；也可手动将播放窗口拖到副屏。");
  if(U)return void Ke("播放窗口已进入全屏，主副屏翻页保持同步。");
  if(!A)return void Ke(!1===window.screen.isExtended?"当前为单屏，可在独立窗口排练；连接副屏后点击「识别屏幕」。":"可将播放窗口拖到副屏，在工作台点击「副屏全屏」或按 F；主副屏翻页会保持同步。");
  if(A.screens.length<2)return void Ke("检测到一块屏幕，可在独立窗口排练；连接副屏后重新选择播放屏幕。");
  const e=Ze(Ve()),t=H;
  Ke((t&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&t.x+t.width/2>=e.left&&t.x+t.width/2<e.left+e.width&&t.y+t.height/2>=e.top&&t.y+t.height/2<e.top+e.height?"已投放到「":"已选择「")+e.label+"」"+(U?" · 正在全屏放映。":"；可在工作台点击「副屏全屏」或按 F。"))}
async function lt(){
  await Je(),"presenter"===u&&(W=null,ct(),at())}
function ut(e){
  return e&&["left","top","width","height"].every(t=>Number.isFinite(e[t]))&&e.width>0&&e.height>0}
async function dt(){
  if(A)return A;
  if("function"!=typeof window.getScreenDetails)return null;
  try{
    if("granted"===(await navigator.permissions.query({
      name:"window-management"}
    )).state)return await Je()}
  catch{
    }
  return null}
async function pt(e,t,n){
  if("audience"!==u)return;
  tt();
  const r=B,i=ut(e)?e:null,s=i&&z&&(i.screenLeft!==z.screenLeft||i.screenTop!==z.screenTop);
  if(document.fullscreenElement&&(s||!z&&i&&!Qe(i,Ae())))try{
    await document.exitFullscreen()}
  catch{
    }
  if("audience"!==u||r!==B)return;
  if(z=i,i&&!document.fullscreenElement&&et(window,i),Oe(),await dt(),"audience"!==u||r!==B)return;
  const o=e=>{
    n&&Le("placement-ready",{
      requestId:n,placed:e,geometry:Ae()}
    )}
  ;
  if(!i)return o(!0),void(t&&ft(!0));
  const a=e=>{
    if("audience"===u&&r===B){
      if(Y=null,Qe(i,Ae()))return Oe(),o(!0),void(t&&!document.fullscreenElement&&ft(!0));
      document.fullscreenElement||et(window,i),Oe(),e<4?Y=setTimeout(()=>a(e+1),[120,240,480,800][e]):o(Qe(i,Ae()))}
    }
  ;
  Y=setTimeout(()=>a(0),120)}
async function ft(e=!1){
  if("audience"!==u)return!1;
  if(document.fullscreenElement)return!0;
  let t=null;
  if(z&&(A||e||await Je(),t=Array.from(A?.screens||[]).find(e=>(e.availLeft??e.left??0)===z.screenLeft&&(e.availTop??e.top??0)===z.screenTop),!t&&!Qe(z,Ae())))return!1;
  try{
    if(!document.documentElement.requestFullscreen)throw new Error("Fullscreen unavailable");
    return await document.documentElement.requestFullscreen(t?{
      screen:t,navigationUI:"hide"}
    :{
      navigationUI:"hide"}
    ),!0}
  catch{
    if(t&&(!z||Qe(z,Ae())))try{
      return await document.documentElement.requestFullscreen({
        navigationUI:"hide"}
      ),!0}
    catch{
      }
    return fe(),Le("fullscreen",{
      fullscreen:!1}
    ),!1}
  }
function ht(t,n=""){
  K?.placement?.(!1),K?.timer&&clearTimeout(K.timer),K=null,e("presenter-fullscreen").disabled=!1,t?(U=!0,X="",Te(!0),T&&Ee()):X=n||"浏览器未允许副屏全屏，请检查全屏权限后重试；也可在播放窗点击「全屏」。",ct(),yt()}
async function mt(){
  if(K)return;
  if(!k||!x||x.closed)return void Ke("请先打开播放窗口，再进入副屏全屏。");
  if(U&&(!Ve()||Qe(_e(Ve()),H)))return void ct();
  const t=x,n=Me("fullscreen-request");
  K={
    id:n.id,timer:null}
  ;
  const r=K;
  yt(),e("presenter-fullscreen").disabled=!0,X="正在请求副屏全屏…",ct();
  try{
    if(fileAudienceMarkup){
      const e=st(t);
      if(null===e)return void ht(!1,"本地文件互换后刷新了工作台，浏览器限制了跨窗全屏授权。请在观众窗口点击「全屏」；使用 HIT-HTML-local.cmd 可由工作台直接全屏。");
      if(!e)return void ht(!1,"播放窗口已重新连接，请再点击一次「副屏全屏」或按 F。")}
    if(await dt(),K!==r||"presenter"!==u)return;
    if("presenter"!==u||t.closed)throw new Error("播放窗口已关闭");
    const e=Ve(),i=e?_e(e):null;
    webSwapEligible()||et(t,i);
    const s="https:"===location.protocol&&b&&!E&&e?(n.box=i,!0):await new Promise(e=>{
      r.placement=t=>{
        clearTimeout(r.timer),r.timer=null,r.placement=null,e(t)}
      ,r.timer=setTimeout(()=>r.placement?.(!1),2e3),Le("place",{
        box:i,fullscreen:!1,requestId:n.id}
      )}
    );
    if(K!==r||"presenter"!==u)return;
    if(!s)return void ht(!1,"播放窗口尚未移到副屏，请允许屏幕管理权限后点击「识别屏幕」重试。");
    K.timer=setTimeout(()=>ht(!1,"播放窗口未响应全屏请求，请重新打开播放窗后重试。"),4e3);
    try{
      t.postMessage(n,{
        targetOrigin:"file:"===location.protocol?"/":v,delegate:"fullscreen"}
      )}
    catch{
      t.postMessage(n,v)}
    }
  catch{
    ht(!1,"播放窗口未能就绪，请重新打开播放窗后重试。")}
  }
async function gt(){
  if("presenter"!==u)if(document.fullscreenElement)try{
    await document.exitFullscreen()}
  catch{
    }
  else if("audience"!==u)try{
    await document.documentElement.requestFullscreen()}
  catch{
    fe()}
  else await ft();
  else await mt()}
function wt(e){
  h();
  const t=new URL(location.href);
  t.searchParams.delete("hit-session"),"deck"===e?t.searchParams.delete("role"):t.searchParams.set("role",e);
  const n=history.state,r=n&&"object"==typeof n&&!Array.isArray(n)?{
    ...n}
  :{
    }
  ;
  r[o]={
    deckKey:s,session:p,role:e,popup:b}
  ;
  try{
    history.replaceState(r,"",t.href)}
  catch{
    try{
      history.replaceState(r,"")}
    catch{
      }
    new URL(location.href).searchParams.has("hit-session")&&location.replace(t.href)}
  }
function vt(n){
  "audience"===u&&"audience"!==n&&tt(),"audience"===u&&"audience"!==n&&document.fullscreenElement&&document.exitFullscreen().catch(()=>{
    }
  ),u=n,document.documentElement.dataset.role=n,document.body.dataset.mode=n,wt(n),t.hidden="presenter"!==n,document.querySelector(".deck-viewport").inert="presenter"===n,document.querySelector(".controls").inert="presenter"===n,yt(),"presenter"===n?(Pe(),Ge(),We(),t.focus(),Te(k),dt().then(e=>{
    e&&"presenter"===u&&at()}
  )):(ue(),fe(),"deck"===n&&e("presenter-start").focus())}
function yt(){
  const t=!k||!!J||!!K||"deck"===u;
  e("presenter-swap").disabled=t,e("audience-swap").disabled=t}
function bt(){
  J?.timer&&clearTimeout(J.timer),J=null,yt()}
function xt(e,t,n){
  bt();
  const r=J={
    id:e,phase:t,initiator:n}
  ;
  return r.timer=setTimeout(()=>{
    J===r&&(bt(),"commit"===r.phase&&"audience"===u&&x?.closed&&(vt("presenter"),Te(!1)),"presenter"===u&&Ke("对方窗口未响应双屏互换，请检查连接后重试。"))}
  ,"web"===t?6000:3500),yt(),r}
function webSwapEligible(){
  return"https:"===location.protocol&&A&&A.screens.length>1&&("presenter"===u?b&&!E:"audience"===u&&!b)}
function webScreenBox(geometry){
  return Array.from(A?.screens||[]).map(_e).find(box=>Qe(box,geometry))||null}
function webScreenMatches(box,screen){
  const area=Ze(screen);
  return!!area&&box.screenLeft===area.left&&box.screenTop===area.top&&box.screenWidth===area.width&&box.screenHeight===area.height}
async function webPlacement(box,transaction,fullscreen=false,targetWindow=window){
  let details=A;
  try{
    if(targetWindow!==window)details=await targetWindow.getScreenDetails()}
  catch{
    return false}
  const deadline=Date.now()+2500;
  let stable=0;
  while(J===transaction&&Date.now()<deadline){
    let geometry,current;
    try{
      geometry=targetWindow===window?Ae():{
        x:targetWindow.screenX,y:targetWindow.screenY,width:targetWindow.outerWidth,height:targetWindow.outerHeight}
      ;
      current=details?.currentScreen}
    catch{
      return false}
    const placed=fullscreen?!!document.fullscreenElement&&webScreenMatches(box,current):Qe(box,geometry)&&(!current||webScreenMatches(box,current));
    if(placed){
      if(!stable)stable=Date.now();
      if(Date.now()-stable>=180)return true}
    else{
      stable=0;
      if(!fullscreen)et(targetWindow,box)}
    await new Promise(resolve=>setTimeout(resolve,60))}
  return false}
function webSwap(){
  const audience=u==="audience";
  let viewer=audience?document.fullscreenElement&&A?.currentScreen?_e(A.currentScreen):webScreenBox(Ae()):U&&Ve()?_e(Ve()):webScreenBox(H);
  let workbench=audience?null:webScreenBox(Ae());
  if(audience)try{
    workbench=webScreenBox({
      x:x.screenX,y:x.screenY,width:x.outerWidth,height:x.outerHeight}
    )}
  catch{
    }
  if(!ut(viewer)||!ut(workbench)||viewer.screenLeft===workbench.screenLeft&&viewer.screenTop===workbench.screenTop){
    if(!audience)Ke("请先确认工作台与播放画面位于不同屏幕。");
    return}
  const swapId=i(),data={
    swapId:swapId,box:workbench,workbenchBox:viewer}
  ;
  xt(swapId,"web",f);
  if(audience)return void webSwapAudience(data);
  try{
    x.postMessage(Me("web-swap",data),{
      targetOrigin:v,delegate:"fullscreen"}
    )}
  catch{
    bt();
    Ke("浏览器未允许换屏全屏授权，请在观众窗口点击「换屏」重试。")}
  }
async function webSwapAudience(data){
  if(u!=="audience"||!ut(data.box)||!ut(data.workbenchBox)||J&&J.id!==data.swapId)return;
  const transaction=xt(data.swapId,"web",f);
  tt();
  Le("web-swap-begin",{
    swapId:data.swapId}
  );
  let fullscreen=false;
  try{
    const screen=Array.from(A?.screens||[]).find(screen=>webScreenMatches(data.box,screen));
    try{
      window.focus()}
    catch{
      }
    if(screen&&await webPlacement(data.workbenchBox,transaction,false,x)){
      await(document.fullscreenElement||document.documentElement).requestFullscreen({
        screen,navigationUI:"hide"}
      );
      fullscreen=await webPlacement(data.box,transaction,true)}
    }
  catch{
    }
  if(J!==transaction||u!=="audience")return;
  if(fullscreen)z=data.box;
  const actualBox=A?.currentScreen?_e(A.currentScreen):webScreenBox(Ae());
  Le("web-swap-result",{
    swapId:data.swapId,box:data.box,workbenchBox:data.workbenchBox,fullscreen,audienceFullscreen:!!document.fullscreenElement,actualBox,geometry:Ae()}
  )}
async function webSwapComplete(data){
  if(u!=="presenter"||J?.id!==data.swapId||!ut(data.box)||!ut(data.workbenchBox))return;
  const transaction=J,actual=ut(data.actualBox)?data.actualBox:data.fullscreen?data.box:data.workbenchBox,popupBox=actual.screenLeft===data.workbenchBox.screenLeft&&actual.screenTop===data.workbenchBox.screenTop?data.box:data.workbenchBox;
  const placed=await webPlacement(popupBox,transaction);
  if(J!==transaction||u!=="presenter")return;
  q="auto";
  const target=Array.from(A?.screens||[]).find(screen=>webScreenMatches(actual,screen));
  W=target?Xe(target):null;
  R=false;
  U=!!data.audienceFullscreen;
  H=data.geometry||null;
  Le("web-swap-done",{
    swapId:data.swapId}
  );
  bt();
  je();
  ct();
  Ce();
  if(!data.fullscreen)Ke("换屏全屏未完成，已保留分屏；请点击「副屏全屏」重试。");
  if(!placed)Ke("工作台尚未移到另一屏幕，请检查屏幕权限后重试。");
  try{
    window.focus()}
  catch{
    }
  }
function Et(){
  if("deck"===u||J||K||G||!k||!x||x.closed)return;
  if(webSwapEligible())return void webSwap();
  const e=i();
  "presenter"===u?kt(e,f,U):(xt(e,"request",f),Le("swap-request",{
    swapId:e,fullscreen:!!document.fullscreenElement}
  ))}
function kt(t,n,r){
  K?Le("swap-abort",{
    swapId:t}
  ):!J&&"string"==typeof t&&t&&k&&x&&!x.closed&&(xt(t,"prepare",n).fullscreen=r,K?.placement?.(!1),K?.timer&&clearTimeout(K.timer),K=null,X="",e("presenter-fullscreen").disabled=!1,R=!1,At(),Ke("正在互换两个窗口的角色…"),Le("swap-prepare",{
    swapId:t,initiator:n}
  ))}
async function St(e){
  if("string"!=typeof e.swapId||!e.swapId)return;
  if(J?.id===e.swapId&&"prepare"===J.phase)return;
  const t=xt(e.swapId,"prepare",e.initiator),n=!!document.fullscreenElement;
  tt(),At();
  try{
    n&&await document.exitFullscreen(),J===t&&"audience"===u&&Le("swap-ready",{
      swapId:e.swapId,fullscreen:n}
    )}
  catch{
    bt(),Le("swap-abort",{
      swapId:e.swapId}
    )}
  }
function It(e){
  const t=J,n=Ae(),r=Array.from(A?.screens||[]).find(e=>Qe(_e(e),n))||A?.currentScreen;
  t.phase="commit",t.fullscreen||=e;
  const i={
    swapId:t.id,initiator:t.initiator,fullscreen:t.fullscreen,state:Ie(),settings:{
      fontSize:ne,layout:te}
    ,presenterGeometry:n,presenterScreen:r?Ze(r):null}
  ;
  Ce(),Le("swap-commit",i),z=r?_e(r):null,vt("audience"),Oe()}
async function Nt(e){
  if(!Number.isFinite(e.state?.index))return;
  if(V=e.swapId,At(),R=!1,P=!0,U=!1,j=null,z=null,q="auto",W=e.presenterScreen?Xe(e.presenterScreen):null,H=e.presenterGeometry||null,X="",Number.isFinite(e.settings?.fontSize)&&(ne=Math.max(14,Math.min(34,e.settings.fontSize))),e.settings&&(te=e.settings.layout||null),ce(),Ne(e.state),vt("presenter"),await dt(),"presenter"!==u||V!==e.swapId)return void(P=!1);
  const t=Array.from(A?.screens||[]).find(t=>Qe(_e(t),e.presenterGeometry));
  t&&(W=Xe(t)),je(),P=!1,bt(),Te(!0),at(),$e(),Le("swap-done",{
    swapId:e.swapId}
  ),ct(),e.fullscreen&&e.initiator===f&&mt()}
function Ct(){
  "audience"!==u&&("presenter"!==u&&(W=null,T=null===L&&0===M,vt("presenter"),Ce()),ot())}
function Mt(){
  if("presenter"===u){
    if(bt(),K?.placement?.(!1),K?.timer&&clearTimeout(K.timer),K=null,X="",e("presenter-fullscreen").disabled=!1,Le("end"),E&&x&&!x.closed)try{
      x.close()}
    catch{
      }
    if(x=null,E=!1,Te(!1),vt("deck"),b)try{
      window.close()}
    catch{
      }
    }
  }
let Lt=!1,$t=null;
function Ft(){
  const t=e("overview-modal");
  t.open&&t.querySelectorAll(".p-preview").forEach(e=>{
    const t=e.querySelector(".p-preview-stage"),n=e.clientWidth,r=e.clientHeight,i=Math.min(n/CONFIG.width,r/CONFIG.height);
    t.style.transform=`translate(${(n-CONFIG.width*i)/2}px,${(r-CONFIG.height*i)/2}px) scale(${i})`}
  )}
function Tt(){
  !Lt&&(Lt=!0,slides.forEach((t,n)=>{
    const r=document.createElement("button");
    r.type="button",r.className="p-overview-item",r.dataset.slideIndex=String(n),r.setAttribute("aria-label",`第 ${n+1} 页 · ${he(n)}`);
    const i=document.createElement("div");
    i.className="p-preview";
    const s=document.createElement("div");
    s.className="p-preview-stage",s.setAttribute("aria-hidden","true"),ze(s,n,"hit-overview-"+n),i.append(s);
    const o=document.createElement("div");
    o.className="p-overview-caption";
    const a=document.createElement("span");
    a.textContent=String(n+1).padStart(2,"0");
    const c=document.createElement("strong");
    c.textContent=he(n),o.append(a,c),r.append(i,o),r.onclick=()=>{
      de(n),At()}
    ,e("overview-grid").append(r)}
  ),"ResizeObserver"in window)&&new ResizeObserver(Ft).observe(e("overview-grid"))}
function At(){
  const t=e("overview-modal");
  t.open&&(t.close(),$t?.isConnected&&$t.focus())}
function Ot(){
  const t=e("overview-modal");
  if(t.open)return void At();
  Tt(),$t=document.activeElement;
  const n=[...e("overview-grid").children];
  n.forEach((e,t)=>e.setAttribute("aria-current",String(t===I))),t.showModal(),Ft(),n[I]?.focus()}
e("overview-toggle").onclick=Ot,e("presenter-overview").onclick=Ot,e("overview-close").onclick=At,e("overview-modal").addEventListener("cancel",e=>{
  e.preventDefault(),At()}
),e("overview-modal").addEventListener("click",t=>{
  if(t.target!==e("overview-modal"))return;
  const n=t.target.getBoundingClientRect();
  (t.clientX<n.left||t.clientX>n.right||t.clientY<n.top||t.clientY>n.bottom)&&At()}
),window.addEventListener("resize",Ft),document.addEventListener("click",e=>{
  const t=e.target.closest("[data-target]");
  t&&!t.closest(".p-preview-stage")&&(e.preventDefault(),de(Number(t.dataset.target)))}
),e("prev").onclick=()=>pe(-1),e("next").onclick=()=>pe(1),e("fullscreen").onclick=gt,e("print").onclick=()=>window.print(),e("presenter-start").onclick=Ct,e("presenter-open").onclick=ot,e("presenter-exit").onclick=Mt,e("presenter-fullscreen").onclick=gt,e("presenter-swap").onclick=Et,e("audience-swap").onclick=Et,e("presenter-prev").onclick=()=>pe(-1),e("presenter-next").onclick=()=>pe(1),e("preview-next").onclick=()=>pe(1),e("presenter-slide").onchange=e=>de(Number(e.target.value)),e("presenter-timer-toggle").onclick=ke,e("presenter-timer-reset").onclick=Se,e("presenter-font-down").onclick=()=>{
  ne=Math.max(14,ne-2),e("presenter-script").style.setProperty("--p-note-size",ne+"px"),ce()}
,e("presenter-font-up").onclick=()=>{
  ne=Math.min(34,ne+2),e("presenter-script").style.setProperty("--p-note-size",ne+"px"),ce()}
,e("presenter-layout").onclick=()=>{
  te=null,ce(),We()}
,e("presenter-detect").onclick=lt,e("presenter-screen").onchange=e=>{
  q=e.target.value,W=null,R=!0,at(),ct()}
,document.querySelector(".deck-viewport").addEventListener("dblclick",()=>{
  "audience"===u&&ft()}
),document.addEventListener("fullscreenchange",()=>{
  e("fullscreen").textContent=document.fullscreenElement?"退出全屏":"全屏","audience"===u&&Le("fullscreen",{
    fullscreen:!!document.fullscreenElement}
  ),ue()}
),document.addEventListener("keydown",t=>{
  if(e("overview-modal").open){
    if("Escape"===t.key)return t.preventDefault(),void At();
    const n=[...e("overview-grid").children],r=n.indexOf(document.activeElement),i=getComputedStyle(e("overview-grid")).gridTemplateColumns.split(" ").length;
    let s=null;
    switch(t.key){
      case"ArrowRight":s=r+1;
      break;
      case"ArrowLeft":s=r-1;
      break;
      case"ArrowDown":s=r+i;
      break;
      case"ArrowUp":s=r-i;
      break;
      case"Home":s=0;
      break;
      case"End":s=n.length-1}
    return void(null!==s&&(t.preventDefault(),n[Ue(s,0,n.length-1)]?.focus()))}
  if(t.target.closest('input,textarea,select,[contenteditable="true"]')||t.altKey||t.ctrlKey||t.metaKey)return;
  if(t.target.closest("button,a,summary")&&(" "===t.key||"Enter"===t.key))return;
  let n=!0;
  switch(t.key){
    case"ArrowRight":case"ArrowDown":case"PageDown":case" ":pe(1);
    break;
    case"ArrowLeft":case"ArrowUp":case"PageUp":pe(-1);
    break;
    case"Home":de(0);
    break;
    case"End":de(slides.length-1);
    break;
    case"f":case"F":gt();
    break;
    case"s":case"S":"audience"!==u?Ct():n=!1;
    break;
    case"o":case"O":"presenter"===u?ot():Ot();
    break;
    case"g":case"G":Ot();
    break;
    case"r":case"R":"presenter"===u?Se():n=!1;
    break;
    case"Escape":"presenter"===u?Mt():n=!1;
    break;
    default:n=!1}
  n&&t.preventDefault()}
),document.addEventListener("wheel",t=>{
  if(e("overview-modal").open||"presenter"===u||t.ctrlKey||t.target.closest(".controls"))return;
  const n=Date.now();
  n<N||Math.abs(t.deltaY)<12||(N=n+650,pe(t.deltaY>0?1:-1))}
,{
  passive:!0}
),document.addEventListener("touchstart",t=>{
  C=e("overview-modal").open||"presenter"===u||t.target.closest(".controls")?null:1===t.touches.length?{
    x:t.touches[0].clientX,y:t.touches[0].clientY}
  :null}
,{
  passive:!0}
),document.addEventListener("touchend",e=>{
  if(!C)return;
  const t=e.changedTouches[0].clientX-C.x,n=e.changedTouches[0].clientY-C.y;
  C=null,Math.abs(t)>=40&&Math.abs(t)>Math.abs(n)&&pe(t<0?1:-1)}
,{
  passive:!0}
),document.addEventListener("touchcancel",()=>{
  C=null}
,{
  passive:!0}
),document.addEventListener("pointermove",e=>{
  e.clientY>innerHeight-95&&fe()}
),window.addEventListener("hashchange",()=>de(le(),!1)),window.addEventListener("resize",()=>{
  ue(),"presenter"===u?We():"audience"===u&&Oe()}
),window.addEventListener("afterprint",ue),window.addEventListener("pagehide",()=>Le("closing")),setInterval(xe,250),setInterval(()=>{
  "deck"!==u&&(Le("heartbeat",{
    fullscreen:!!document.fullscreenElement,geometry:Ae()}
  ),Ce(),k&&(x&&x.closed||Date.now()-S>8e3)&&(Te(!1),"presenter"===u&&Ke("播放窗口已断开，可点击「打开播放窗」继续。")))}
,1e3);
const qt="deck"!==u?se(w):null;
wt(u),ue(),de(le(),!0,!1,!1),"deck"!==u?(qt&&Ne(qt),vt(u),Le("ready",{
  geometry:Ae(),fullscreen:!!document.fullscreenElement}
)):(document.documentElement.dataset.role="deck",fe());
