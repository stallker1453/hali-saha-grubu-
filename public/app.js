
let state=null;
async function load(){const r=await fetch('/api/state');state=await r.json();render();}
function render(){
 const s=state, coming=s.signups||[], cap=s.match.capacity;
 document.getElementById('count').textContent=`${coming.length} / ${cap}`;
 document.getElementById('progress').style.width=Math.min(100,coming.length/cap*100)+'%';
 const white=coming.filter(x=>x.team==='white'), black=coming.filter(x=>x.team==='black');
 // simple balanced assignment for current match
 coming.forEach((x,i)=>x.team=(i%2===0?'white':'black'));
 const w=coming.filter(x=>x.team==='white').slice(0,7), b=coming.filter(x=>x.team==='black').slice(0,7), bench=coming.slice(14);
 document.getElementById('whiteCount').textContent=w.length;
 document.getElementById('blackCount').textContent=b.length;
 document.getElementById('benchCount').textContent=bench.length;
 document.getElementById('whiteLabel').textContent=`${w.length}/7`;
 document.getElementById('blackLabel').textContent=`${b.length}/7`;
 document.getElementById('whiteList').innerHTML=w.map(x=>`<li>${esc(x.name)}</li>`).join('');
 document.getElementById('blackList').innerHTML=b.map(x=>`<li>${esc(x.name)}</li>`).join('');
 document.getElementById('signupList').innerHTML=coming.map(x=>`<div class="signup"><div class="avatar">${initials(x.name)}</div><div><div class="name">${esc(x.name)}</div><div class="meta">${x.team==='white'?'Beyaz Takım':'Siyah Takım'}</div></div><span class="pill">Geliyor</span></div>`).join('') || '<div class="muted" style="padding:14px 0">Henüz kimse yazılmadı.</div>';
 document.getElementById('players').innerHTML=s.players.map(p=>`<div class="player"><span>${esc(p.name)}</span><button class="smallbtn" onclick="removePlayer(${p.id},'${esc(p.name)}')">Sil</button></div>`).join('');
 document.getElementById('playerSelect').innerHTML=s.players.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
}
function esc(x){return String(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function initials(n){return n.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function scrollToPlayers(){document.getElementById('playersSection').scrollIntoView({behavior:'smooth'});}
function openSignup(){document.getElementById('modal').classList.remove('hidden')}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
async function addPlayer(){
 const name=document.getElementById('newName').value.trim(), pin=document.getElementById('newPin').value.trim();
 const r=await fetch('/api/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,pin})});
 const d=await r.json(); if(!r.ok)return alert(d.error||'Hata');
 document.getElementById('newName').value='';document.getElementById('newPin').value='';await load();alert('Oyuncu eklendi.');
}
async function signup(){
 const playerId=document.getElementById('playerSelect').value;if(!playerId)return alert('Önce oyuncu ekleyin.');
 const r=await fetch('/api/signups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:Number(playerId)})});
 const d=await r.json();if(!r.ok)return alert(d.error||'Hata');closeModal();load();
}
async function removePlayer(id,name){
 const pin=prompt(`${name} oyuncusunu silmek için 4 haneli PIN:`);
 if(pin===null)return;
 const r=await fetch('/api/players/'+id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});
 const d=await r.json();if(!r.ok)return alert(d.error||'Silinemedi');load();
}
async function adminReset(){
 const key=prompt('Admin anahtarı:');if(key===null)return;
 const r=await fetch('/api/admin/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});
 const d=await r.json();if(!r.ok)return alert(d.error||'Yetkisiz');load();
}
load();
