const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public and root (CSS/JS in root)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname))); // root folder for CSS/JS

app.use(session({ secret:'replace-with-strong-secret', resave:false, saveUninitialized:true }));

// Supabase setup
const supabaseUrl = 'https://xleaklvlxpfcjcqsantd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZWFrbHZseHBmY2pjcXNhbnRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA3MTA0MywiZXhwIjoyMDcwNjQ3MDQzfQ.JlPX0F_Cfb-yXUE5-VX2p1DC41zWWSGpCKDjGDNaDXY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Serve customer page as home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

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

// Reset database endpoint (admin only)
app.post('/admin/reset-database', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Delete all bookings
    await supabase.from('bookings').delete().neq('id', 0);

    // Optional: delete admin to allow first-run setup again
    // await supabase.from('admin').delete().neq('id', 0);

    res.json({ success: true, message: 'Database cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log('Server running on port '+PORT));