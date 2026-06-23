const fs = require('fs');
const { JSDOM } = require('jsdom');
let html = fs.readFileSync('/mnt/data/CTED_CHANDRA_Website_V2.2_CLO_Standalone.html','utf8')
  .replace(/<link rel="preconnect"[^>]*>/g,'')
  .replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const dom = new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/#home',pretendToBeVisual:true,beforeParse(w){
  w.scrollTo=()=>{}; w.URL.createObjectURL=()=> 'blob:test'; w.URL.revokeObjectURL=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
  w.navigator.clipboard={writeText:async()=>{}};
}});
const d=dom.window.document;
function ok(c,m){if(!c) throw new Error(m)}
ok(d.querySelector('#home-stats').children.length===5,'stats');
d.querySelector('[data-route="clos"]').click();
ok(d.querySelector('#clo-total-count').textContent.includes('316'),'CLO total');
ok(d.querySelectorAll('#clo-list article').length===8,'CLO cards');
const input=d.querySelector('#clo-search'); input.value='CLO44'; input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
ok(d.querySelector('#clo-list').textContent.includes('CTED1301'),'CLO search');
d.querySelector('#clo-list [data-course-code="CTED1301"]').click();
ok(d.querySelector('#course-dialog').hasAttribute('open'),'dialog');
ok(d.querySelectorAll('#dialog-content .clo-item').length===8,'CLO detail count');
console.log('PASS: standalone V2.2 CLO verified');
