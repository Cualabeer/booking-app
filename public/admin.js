document.addEventListener('DOMContentLoaded',async()=>{
const f=document.getElementById('adminFormContainer');
const d=document.getElementById('dashboard');
const logoutBtn=document.getElementById('logoutBtn');

async function loadBookings(){
  try{
    const res=await fetch('/admin/bookings',{credentials:'include'});
    const bookings=await res.json();
    const tbody=document.querySelector('#bookingsTable tbody');
    tbody.innerHTML='';
    bookings.forEach(b=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${b.id}</td><td>${b.name}</td><td>${b.email}</td><td>${b.phone}</td><td>${b.vehicle}</td><td>${b.date}</td><td>${b.time}</td><td>${b.bay}</td><td>${b.garage}</td><td>${b.status}</td>`;
      tbody.appendChild(tr);
    });
  }catch(err){console.error(err);}
}

async function checkLoginStatus(){
  try{
    const res=await fetch('/admin/status',{credentials:'include'});
    const data=await res.json();
    if(data.loggedIn){d.style.display='block';f.style.display='none';loadBookings();}
    else showLoginForm(false);
  }catch{showLoginForm(false);}
}

function showLoginForm(firstTime){
  f.innerHTML='';
  const t=document.createElement('h2');
  t.innerText=firstTime?'Set Admin Email & Password':'Admin Login';
  f.appendChild(t);
  const form=document.createElement('form');
  form.innerHTML=`<input type="email" id="email" placeholder="Email" required><input type="password" id="password" placeholder="Password" required><button type="submit">${firstTime?'Set Account':'Login'}</button>`;
  f.appendChild(form);
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=document.getElementById('email').value.trim();
    const pwd=document.getElementById('password').value.trim();
    if(!email||!pwd) return alert('Email/password required');
    const payload=firstTime?{setEmail:email,setPassword:pwd}:{email,password:pwd};
    try{
      const res=await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'include'});
      const data=await res.json();
      if(data.success){d.style.display='block';f.style.display='none';loadBookings();}
      else alert(data.error||'Login failed');
    }catch(err){alert(err.message);}
  });
}

logoutBtn?.addEventListener('click',async()=>{
  try{
    const res=await fetch('/admin/logout',{method:'POST',credentials:'include'});
    const data=await res.json();
    if(data.success){d.style.display='none';f.style.display='block';}
    else alert(data.error||'Logout failed');
  }catch(err){alert('Logout failed:'+err.message);}
});

checkLoginStatus();
});