const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')));
app.use(session({ secret:'replace-with-strong-secret', resave:false, saveUninitialized:true }));

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin login / first-run setup
app.post('/admin/login', async (req,res)=>{
  const {email,password,setEmail,setPassword} = req.body;
  let { data: admin } = await supabase.from('admin').select('*').limit(1).single();

  if(!admin){
    if(!setEmail || !setPassword) return res.status(400).json({error:'Provide email/password'});
    const hash = await bcrypt.hash(setPassword,10);
    await supabase.from('admin').insert({ email: setEmail, password_hash: hash });
    req.session.admin = true;
    return res.json({success:true,firstRun:true});
  }

  if(email !== admin.email) return res.status(401).json({error:'Invalid email/password'});
  const match = await bcrypt.compare(password, admin.password_hash);
  if(match){ req.session.admin = true; return res.json({success:true,firstRun:false}); }
  else return res.status(401).json({error:'Invalid email/password'});
});

app.get('/admin/status',(req,res)=>{ res.json({loggedIn:!!req.session.admin}); });
app.post('/admin/logout',(req,res)=>{ req.session.destroy(err=>{ if(err) return res.status(500).json({success:false,error:'Logout failed'}); res.clearCookie('connect.sid',{path:'/'}); res.json({success:true}); }); });

// Booking endpoints
app.get('/admin/bookings', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const { data, error } = await supabase.from('bookings').select('*');
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});

app.post('/admin/bookings', async (req,res)=>{
  const {name,email,phone,vehicle,date,time,bay,garage,status} = req.body;
  if(!name||!email||!phone||!vehicle||!date||!time||!bay||!garage) return res.status(400).json({error:'All fields required'});
  const { data, error } = await supabase.from('bookings').insert([{name,email,phone,vehicle,date,time,bay,garage,status:'Pending'}]);
  if(error) return res.status(500).json({error:error.message});
  res.json({success:true,bookingId:data[0].id});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log('Server running on port '+PORT));