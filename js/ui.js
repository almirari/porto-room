const modal=document.getElementById('modal'),mc=document.getElementById('mc');let onClose=null;
export const isOpen=()=>modal.style.display==='flex';
export function show(html,cb){mc.innerHTML=html;modal.style.display='flex';onClose=cb||null}
export function closeModal(){modal.style.display='none';mc.innerHTML='';if(onClose)onClose();onClose=null}
document.getElementById('x').onclick=closeModal;
modal.addEventListener('pointerdown',e=>{if(e.target===modal)closeModal()});
addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
