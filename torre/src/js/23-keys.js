/* =====================================================================
   ACESSIBILIDADE E ATALHOS: janelas nativas (<dialog>: Esc e foco preso
   de graça), atalhos de teclado e a ajuda (?).
   ===================================================================== */
var lastFocus=null;
function openDlg(d){
  if(!d)return;lastFocus=document.activeElement;
  if(typeof d.showModal==='function'){if(!d.open)d.showModal()}else d.setAttribute('open','');
}
function closeDlg(d){
  if(!d||!d.open)return;
  if(typeof d.close==='function')d.close();else d.removeAttribute('open');
}
/* devolve o foco para quem abriu e fecha ao clicar no fundo */
document.querySelectorAll('dialog').forEach(function(d){
  d.addEventListener('close',function(){if(lastFocus&&lastFocus.focus&&document.contains(lastFocus))lastFocus.focus()});
  if(d.id!=='apDlg'&&d.id!=='reportDlg')d.addEventListener('click',function(e){if(e.target===d)closeDlg(d)});
});
function typing(e){var t=e.target;return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)}
document.addEventListener('keydown',function(e){
  if(e.ctrlKey||e.metaKey||e.altKey||typing(e))return;
  if(document.querySelector('dialog[open]'))return;
  var k=e.key;
  if(k>='1'&&k<='7'){var t=TAB_ORDER[+k-1];if(t){e.preventDefault();if(t==='top')goFloor('top');else{if(onTop)go('office');go(t)}}}
  else if(k==='e'||k==='E'){e.preventDefault();nextFloor()}
  else if(k==='r'||k==='R'){e.preventDefault();if(onTop)go('office');openNextApproval()}
  else if(k==='?'){e.preventDefault();openDlg($('#helpDlg'))}
  else if(k==='Escape'){if(TL.on)stopTimeline();else if(F.sel||selRoom)select(null)}
});
$('#helpClose').addEventListener('click',function(){closeDlg($('#helpDlg'))});
$('#btnHelp').addEventListener('click',function(){openDlg($('#helpDlg'))});
