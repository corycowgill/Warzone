import {NATIONS,NATION_ABILITIES} from '../core/Constants.js';

const identities={
 america:['Industrial might','Versatile armies. Fast production.','USA'],
 britain:['Defensive mastery','Hold the line. Command the seas.','GBR'],
 france:['Entrenched firepower','Dig in. Strike through resistance.','FRA'],
 japan:['Relentless assault','Close the distance. Fight to the last.','JPN'],
 germany:['Armored spearhead','Break the front with mobile armor.','DEU'],
 austria:['Engineering advantage','Build efficiently. Outproduce your rival.','AUT']
};

export class BriefingMenu {
 constructor(ui){
  this.ui=ui;this.root=ui.nationSelectEl;if(!this.root)return;
  const content=this.root.querySelector('.nation-select-content');
  content.classList.add('command-briefing');
  const intro=content.querySelector('.briefing-intro');intro.textContent='Your nation. Your doctrine. Your battlefield.';
  this.tabs=document.createElement('nav');this.tabs.className='briefing-steps';this.tabs.setAttribute('aria-label','Battle preparation');
  this.tabs.innerHTML='<button type="button" data-step="0"><span>01</span> Choose command</button><button type="button" data-step="1"><span>02</span> Battlefield setup</button>';
  intro.after(this.tabs);
  this.commands=content.querySelector('.nation-panels');this.commands.id='briefing-command';
  this.setup=document.createElement('section');this.setup.id='briefing-battlefield';this.setup.className='briefing-battlefield';
  for(const id of ['map-select','biome-select','difficulty-select','gamemode-select'])this.setup.append(document.getElementById(id));
  this.commands.after(this.setup);
  const note=document.createElement('p');note.className='opponent-note';note.textContent='Pick an opponent, or let intelligence choose one for you.';
  const random=document.createElement('button');random.type='button';random.className='random-opponent';random.textContent='Random opponent';random.setAttribute('aria-pressed','true');
  random.onclick=()=>{ui.selectedEnemyNation=null;this.commands.querySelectorAll('#enemy-nations .nation-card').forEach(c=>c.classList.remove('selected'));this.sync();};
  this.commands.querySelector('.enemy-panel .panel-header').after(note,random);this.random=random;
  for(const card of this.commands.querySelectorAll('.nation-card')){
   const key=card.dataset.nation,[role,tagline,code]=identities[key],nation=NATIONS[key],ability=NATION_ABILITIES[key];
   const button=document.createElement('button');button.type='button';button.className='nation-card';button.dataset.nation=key;
   button.innerHTML=`<span class="country-heading"><span class="nation-flag flag-${key}" aria-hidden="true"></span><span><span class="nation-code">${code} / ${role}</span><strong class="nation-name">${nation.name}</strong></span><span class="country-check" aria-hidden="true">✓</span></span><span class="country-tagline">${tagline}</span><span class="nation-passive">${nation.passiveDesc}</span><span class="nation-ability">${ability.name}: ${ability.description}</span>`;
   card.replaceWith(button);
  }
  this.footer=content.querySelector('.nation-select-actions');this.footer.classList.add('briefing-footer');
  this.summary=document.createElement('div');this.summary.className='deployment-summary';this.summary.setAttribute('aria-live','polite');
  this.next=document.createElement('button');this.next.type='button';this.next.className='menu-btn briefing-next';this.next.textContent='Battlefield setup →';this.next.onclick=()=>this.showStep(1,true);
  this.previous=document.createElement('button');this.previous.type='button';this.previous.className='briefing-previous';this.previous.textContent='← Change command';this.previous.onclick=()=>this.showStep(0,true);
  this.footer.prepend(this.summary,this.previous,this.next);
  document.getElementById('btn-back-menu').textContent='Main menu';
  this.tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>this.showStep(Number(b.dataset.step),true));
  this.root.addEventListener('click',()=>queueMicrotask(()=>this.sync()));
  this.root.addEventListener('change',()=>this.sync());
  for(const section of this.setup.children){
   section.classList.add('briefing-setting');section.querySelectorAll('button').forEach(b=>b.type='button');
  }
  const seed=document.getElementById('map-seed-input');seed.type='number';seed.min='1';seed.max='2147483647';seed.placeholder='Random seed';
  seed.id='map-seed-input';seed.setAttribute('aria-label','Map seed (optional)');
  this.root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(this.step===1)this.showStep(0,true);else{ui.showMainMenu();document.getElementById('btn-1player')?.focus();}}});
 }
 reset(){this.showStep(0);this.sync();this.commands.querySelector('.nation-card')?.focus({preventScroll:true});}
 showStep(step,focus=false){
  if(step===1&&(!this.ui.selectedPlayerNation||(this.ui.game.mode==='2P'&&!this.ui.selectedEnemyNation)))return;
  this.step=step;this.commands.hidden=step!==0;this.setup.hidden=step!==1;
  this.root.querySelector('.nation-select-title').textContent=step?'Prepare your battlefield':'Choose your command';
  this.root.querySelector('.command-briefing').scrollTop=0;
  this.next.hidden=step!==0;this.previous.hidden=step!==1;document.getElementById('btn-start-game').hidden=step!==1;
  this.tabs.querySelectorAll('button').forEach(b=>{const active=Number(b.dataset.step)===step;b.setAttribute('aria-current',active?'step':'false');b.setAttribute('aria-controls',Number(b.dataset.step)?this.setup.id:this.commands.id);});
  this.sync();if(focus)(step?this.setup.querySelector('button'):this.commands.querySelector('.nation-card.selected')||this.commands.querySelector('button'))?.focus({preventScroll:true});
 }
 sync(){
  const ui=this.ui,selected=ui.selectedPlayerNation;
  const ready=!!selected&&(ui.game.mode!=='2P'||!!ui.selectedEnemyNation);
  this.next.disabled=!ready;this.tabs.querySelector('[data-step="1"]').disabled=!ready;
  document.getElementById('btn-start-game').disabled=!selected||(ui.game.mode==='2P'&&!ui.selectedEnemyNation);
  this.random.hidden=ui.game.mode==='2P';this.random.setAttribute('aria-pressed',String(!ui.selectedEnemyNation));
  this.commands.querySelector('.enemy-panel .panel-header').textContent=ui.game.mode==='2P'?'Player 2 command':'Opposing command';
  this.commands.querySelector('.opponent-note').textContent=ui.game.mode==='2P'?'Player 2: choose your nation to continue.':'Pick an opponent, or let intelligence choose one for you.';
  for(const card of this.commands.querySelectorAll('.nation-card'))card.setAttribute('aria-pressed',String(card.classList.contains('selected')));
  for(const group of this.setup.children)for(const b of group.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.classList.contains('selected')));
  const label=(selector,fallback)=>this.setup.querySelector(selector+'.selected')?.textContent||fallback;
  this.summary.replaceChildren();const heading=document.createElement('strong');heading.textContent=selected?`${NATIONS[selected].name} vs ${NATIONS[ui.selectedEnemyNation]?.name||(ui.game.mode==='2P'?'Choose Player 2':'Random opponent')}`:'Select your command to continue';
  const detail=document.createElement('span');detail.textContent=`${label('.map-btn','Continental')} / ${label('.biome-btn','Temperate')} / ${label('.difficulty-btn','Normal')} / ${label('.gamemode-btn','HQ Destruction')}`;
  this.summary.append(heading,detail);
 }
}
