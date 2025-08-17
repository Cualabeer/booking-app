const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Supabase setup using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Supabase URL or KEY not set in environment variables');
const supabase = createClient(supabaseUrl, supabaseKey);

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-with-strong-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 }
}));

// Home page
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'public','customer.html')));

// Admin login / first-run password setup
app.post('/admin/login', async (req,res) => {
  const {email,password,setEmail,setPassword} = req.body;
  let { data: admin } = await supabase.from('admin').select('*').limit(1).single();

  if(!admin){ // first-run
    if(!setEmail || !setPassword) return res.status(400).json({error:'Provide email/password'});
    const hash = await bcrypt.hash(setPassword,10);
    await supabase.from('admin').insert({ email:setEmail, password_hash: hash });
    req.session.admin = true;
    return res.json({success:true,firstRun:true});
  }

  if(email !== admin.email) return res.status(401).json({error:'Invalid email/password'});
  const match = await bcrypt.compare(password, admin.password_hash);
  if(match){ req.session.admin = true; return res.json({success:true,firstRun:false}); }
  else return res.status(401).json({error:'Invalid email/password'});
});

// Admin session status
app.get('/admin/status',(req,res)=>{ res.json({loggedIn:!!req.session.admin}); });

// Admin logout
app.post('/admin/logout',(req,res)=>{
  req.session.destroy(err=>{
    if(err) return res.status(500).json({success:false,error:'Logout failed'});
    res.clearCookie('connect.sid',{path:'/'});
    res.json({success:true});
  });
});

// View bookings
app.get('/admin/bookings', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const { data, error } = await supabase.from('bookings').select('*');
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});

// View single booking
app.get('/admin/bookings/:id', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const id = req.params.id;
  const { data, error } = await supabase.from('bookings').select('*').eq('id',id).single();
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});

// Add new booking
app.post('/admin/bookings', async (req,res)=>{
  let {name,email,phone,vehicle,date,time,bay,garage} = req.body;
  if(!name||!email||!phone||!vehicle||!date||!time||!bay||!garage) 
    return res.status(400).json({error:'All fields required'});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email)) return res.status(400).json({error:'Invalid email format'});

  const dateObj = new Date(date);
  if(isNaN(dateObj)) return res.status(400).json({error:'Invalid date format'});
  const formattedDate = dateObj.toISOString().split('T')[0];

  const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(!timeMatch) return res.status(400).json({error:'Invalid time format'});
  const hours = timeMatch[1].padStart(2,'0');
  const minutes = timeMatch[2];
  const seconds = timeMatch[3] ? timeMatch[3] : '00';
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  try {
    const { data, error } = await supabase.from('bookings').insert([{ name,email,phone,vehicle,date:formattedDate,time:formattedTime,bay,garage,status:'Pending' }]);
    if(error) return res.status(500).json({error:error.message});
    if(!data || data.length === 0) return res.status(500).json({error:'Insert failed, no data returned'});
    res.json({success:true, bookingId: data[0].id});
  } catch(err){
    res.status(500).json({error:err.message});
  }
});

// Update booking
app.put('/admin/bookings/:id', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const id = req.params.id;
  const { name,email,phone,vehicle,date,time,bay,garage,status } = req.body;
  try {
    const { data, error } = await supabase.from('bookings').update({ name,email,phone,vehicle,date,time,bay,garage,status }).eq('id',id);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true});
  } catch(err){
    res.status(500).json({error:err.message});
  }
});

// Reset database
app.post('/admin/reset-database', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  try {
    await supabase.from('bookings').delete().neq('id',0);
    res.json({success:true,message:'Database cleared'});
  } catch(err){
    res.status(500).json({error:err.message});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));