// server.js
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(bodyParser.json());

// --- Session setup ---
app.use(session({
  secret: 'YOUR_SECRET_KEY',
  resave: false,
  saveUninitialized: false
}));

// --- Supabase setup ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if(!supabaseUrl || !supabaseKey) throw new Error('Supabase URL and KEY required');
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Serve static files ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// --- Admin Authentication ---
app.post('/admin/login', async (req,res)=>{
  const { email, password } = req.body;
  const { data, error } = await supabase.from('admin')
    .select('*').eq('email', email).eq('password', password);
  if(error) return res.status(500).json({error:error.message});
  if(data.length===0) return res.status(401).json({error:'Invalid credentials'});
  req.session.admin = true;
  res.json({success:true});
});

app.post('/admin/logout',(req,res)=>{
  req.session.destroy(err=>{
    if(err) return res.status(500).json({success:false,error:err.message});
    res.json({success:true});
  });
});

// --- Garage Management ---
app.get('/admin/garages', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const { data, error } = await supabase.from('garages').select('*');
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});

app.post('/admin/garages', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const { name, location, num_ramps } = req.body;
  const { data, error } = await supabase.from('garages')
    .insert([{ name, location, num_ramps }]);
  if(error) return res.status(500).json({error:error.message});
  res.json({success:true, garageId:data[0].id});
});

app.put('/admin/garages/:id', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const { id } = req.params;
  const { name, location, num_ramps } = req.body;
  const { data, error } = await supabase.from('garages')
    .update({ name, location, num_ramps }).eq('id', id);
  if(error) return res.status(500).json({error:error.message});
  res.json({success:true});
});

app.delete('/admin/garages/:id', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const { id } = req.params;
  const { data, error } = await supabase.from('garages').delete().eq('id', id);
  if(error) return res.status(500).json({error:error.message});
  res.json({success:true});
});

// --- Booking Management ---
app.get('/admin/bookings', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const { data, error } = await supabase
    .from('bookings')
    .select('id, customer_name, garage_name:garages.name, slot');
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});

app.delete('/admin/bookings/:id', async (req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:'Unauthorized'});
  const { id } = req.params;
  const { data, error } = await supabase.from('bookings').delete().eq('id', id);
  if(error) return res.status(500).json({error:error.message});
  res.json({success:true});
});

// --- Serve Admin Page ---
app.get('/admin.html', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','admin.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));