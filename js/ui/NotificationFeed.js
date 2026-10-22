// Bounded, coalesced notices; routine production never displaces a combat warning.
export class NotificationFeed {
  constructor(area){this.area=area;this.entries=[];area.setAttribute('role','log');area.setAttribute('aria-live','polite');}
  push(message,color='#ffffff'){
    const urgent=/under attack|under fire|destroyed|defeat|warning/i.test(message);
    let entry=this.entries.find(e=>e.message===message);
    if(entry){clearTimeout(entry.timer);entry.count++;entry.node.textContent=`${message} x${entry.count}`;}
    else{
      if(this.entries.length>=3){
        const oldest=this.entries.find(e=>!e.urgent);
        if(!oldest&&!urgent)return;
        this.remove(oldest??this.entries[0]);
      }
      const node=document.createElement('div');node.className='battle-notice';node.textContent=message;
      node.style.borderColor=color;node.style.color=color;
      entry={message,node,count:1,urgent,timer:null};this.entries.push(entry);this.area.appendChild(node);
    }
    entry.timer=setTimeout(()=>this.remove(entry),urgent?4000:2200);
  }
  remove(entry){clearTimeout(entry.timer);entry.node.remove();this.entries=this.entries.filter(e=>e!==entry);}
  clear(){for(const entry of [...this.entries])this.remove(entry);}
}
