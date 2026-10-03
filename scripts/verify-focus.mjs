import { mkdir, readFile, writeFile } from 'node:fs/promises';
// Real portable UI and DOM events, with a controlled animation clock and isolated
// browser storage. Running this review page never clears a player's real saves.
const clock = `<script>
let qaNow=0; const qaFrames=[];
performance.now=()=>qaNow;
window.requestAnimationFrame=callback=>{qaFrames.push(callback);return qaFrames.length;};
window.qaTick=seconds=>{let left=seconds;do{const step=Math.min(.01,left);qaNow+=step*1000;left-=step;const frames=qaFrames.splice(0);for(const cb of frames)cb(qaNow);}while(left>1e-8);};
const qaStorage=new Map([['expert-pundit-keepyuppy-v2','original-save-sentinel'],['expert-pundit-keepyuppy-focus-intro-v1','seen']]);
Object.defineProperty(window,'localStorage',{value:{getItem:key=>qaStorage.get(key)??null,setItem:(key,value)=>qaStorage.set(key,value)}});
</script>`;
const checks = `<script type="module">
while(!document.body.dataset.focusReady)await new Promise(resolve=>setTimeout(resolve,20));
const get=id=>document.getElementById(id);let checks=0;
function assert(condition,message){if(!condition)throw new Error(message);checks++;}
function choose(id,value){get(id).value=value;get(id).dispatchEvent(new Event('change'));qaTick(0);}
function tap(){get('focus-stage').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));qaTick(0);}
function score(){return Number(get('focus-score').textContent.replaceAll(',',''));}
try {
assert(get('focus-mode').value==='levels','Default mode is not levels');
get('focus-start').click();qaTick(0);
assert(!get('focus-overlay').hidden,'Nameless play was allowed');
assert(get('focus-name').getAttribute('aria-invalid')==='true','Missing name did not show an error');
choose('focus-name','REVIEWER');
assert(get('focus-goal').textContent.includes('0 / 12 ATTEMPTS COMPLETE'),'Opening objective missing');
get('focus-start').click();qaTick(8.02);tap();
assert(score()===300,'First perfect pointer touch did not score 300');
assert(get('focus-mode').disabled,'Mode can change mid-level');
get('focus-pause').click();qaTick(0);
assert(get('focus-pause').textContent==='Resume','Pause did not activate');
const frozen=get('focus-stage').querySelector('canvas').toDataURL();qaTick(2);
assert(get('focus-stage').querySelector('canvas').toDataURL()===frozen,'Paused view moved');
get('focus-pause').click();tap();
assert(score()===300,'Resume countdown accepted input');
get('focus-finish').click();qaTick(0);
assert(get('focus-overlay').querySelector('h1').textContent==='ROUND LEFT','Leave level failed');
assert(Object.keys(JSON.parse(localStorage.getItem('expert-pundit-keepyuppy-focus-v2')).boards).length===0,'Abandoned level was saved');
get('focus-start').click();qaTick(8.02);tap();
for(let hits=1;hits<12;hits++){
 const ramp=Math.max(0,hits-4)/6*.12;
 qaTick(5-2.1*ramp);
 if(hits===1){get('focus-stage').dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));qaTick(0);}else tap();
}
qaTick(2);
assert(get('focus-overlay').querySelector('h1').textContent==='ROUND COMPLETE!','Round did not finish after the final attempt');
assert(score()===22500,'Flawless score and generous bonus incorrect: '+score());
assert(get('focus-intro').textContent.includes('FLAWLESS BONUS +7,500'),'Bonus not shown');
assert(get('focus-intro').querySelector('.focus-stars').textContent==='★★★★★','Perfect level did not get five stars');
assert(!get('focus-next').hidden,'Next-level action missing');
assert(get('focus-board').textContent.includes('22,500'),'Scoreboard did not update');
const saved=JSON.parse(localStorage.getItem('expert-pundit-keepyuppy-focus-v2'));
assert(saved.stars['standard:levels:1']===5,'Five stars not persisted');
assert(saved.boards['standard:attempts:1'].length===1,'Result duplicated');
get('focus-next').click();qaTick(0);
assert(get('focus-goal').textContent.includes('ROUND 2 · 0 / 14 ATTEMPTS COMPLETE'),'Next character round did not start');
get('focus-finish').click();qaTick(0);get('focus-menu').click();
choose('focus-mode','endless');choose('focus-duration','unlimited');get('focus-start').click();qaTick(8.02);tap();
qaTick(5);tap();assert(score()===900,'Perfect chain did not award 600');
qaTick(5.12);tap();assert(score()===940,'Late recovery did not award 40');
assert(get('focus-multiplier').textContent==='×1','Late touch did not reset chain');
get('focus-finish').click();qaTick(0);
assert(get('focus-board').textContent.includes('940'),'Finish did not bank endless score');
get('focus-start').click();qaTick(8.02);tap();qaTick(7);
assert(get('focus-overlay').querySelector('h1').textContent==='BALL DROPPED','Endless drop did not end run');
get('focus-menu').click();choose('focus-mode','practice');
const beforePractice=localStorage.getItem('expert-pundit-keepyuppy-focus-v2');
get('focus-start').click();qaTick(25);
assert(get('focus-overlay').hidden,'Practice ended on a drop');
get('focus-finish').click();qaTick(0);
assert(localStorage.getItem('expert-pundit-keepyuppy-focus-v2')===beforePractice,'Practice posted a score');
get('focus-demo').click();qaTick(40);
assert(get('focus-overlay').querySelector('h1').textContent.includes('DEMO COMPLETE'),'Demo did not complete');
assert(score()===6000,'Demo scoring changed');
assert(localStorage.getItem('expert-pundit-keepyuppy-focus-v2')===beforePractice,'Demo posted a score');
assert(localStorage.getItem('expert-pundit-keepyuppy-v2')==='original-save-sentinel','Original save changed');
get('focus-menu').click();choose('focus-mode','levels');choose('focus-stage-select','1');
assert(get('focus-board').textContent.includes('22,500'),'Level board lost previous score');
choose('focus-difficulty','expert');
assert(get('focus-board').textContent.includes('Your first score'),'Difficulty boards mixed');
assert(get('focus-stage-select').options[1].disabled,'Expert unlock leaked from Standard');
choose('focus-difficulty','standard');choose('focus-stage-select','1');
// Leave a completed level on screen for visual review.
get('focus-start').click();qaTick(8.02);tap();
for(let hits=1;hits<12;hits++){qaTick(5-2.1*Math.max(0,hits-4)/6*.12);tap();}
qaTick(2);assert(score()===22500,'Replay failed');
document.body.dataset.qa='passed';
} catch(error){document.body.dataset.qa='failed';document.body.dataset.qaError=error.message;}
const result=document.createElement('output');result.style='position:fixed;bottom:0;left:0;right:0;background:#111;color:white;padding:12px;z-index:1100;font:14px monospace';result.textContent=document.body.dataset.qa==='passed' ? checks+' browser interaction checks passed' : document.body.dataset.qaError;document.body.append(result);
</script>`;
const portable = await readFile('KeepyUppy-Focus.html', 'utf8');
await mkdir('output/focus-review', { recursive: true });
await writeFile(
  'output/focus-review/controls.html',
  portable.replace('<head>', () => '<head>' + clock).replace('</body>', () => checks + '</body>'),
);
console.log('Open output/focus-review/controls.html and check body[data-qa="passed"].');
