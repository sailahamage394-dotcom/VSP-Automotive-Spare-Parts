const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');
const DB = path.join(DATA, 'db.json');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
const initialProducts = [
 {id:1,name:'Engine Oil Filter',category:'Filters',price:349,stock:30,icon:'🛢️',description:'Reliable filtration for everyday driving.'},
 {id:2,name:'Brake Pad Set',category:'Brakes',price:1299,stock:20,icon:'🛞',description:'Dependable braking performance.'},
 {id:3,name:'LED Headlight Bulb',category:'Lighting',price:799,stock:25,icon:'💡',description:'Bright LED replacement bulb.'},
 {id:4,name:'Air Filter',category:'Filters',price:499,stock:35,icon:'🔧',description:'Helps keep dust away from the engine.'},
 {id:5,name:'Spark Plug',category:'Engine',price:249,stock:50,icon:'⚙️',description:'Ignition component for smooth starts.'},
 {id:6,name:'Car Battery',category:'Electrical',price:4299,stock:10,icon:'🔋',description:'Automotive battery product listing.'}
];
function readDB(){ if(!fs.existsSync(DB)){ const d={users:[],products:initialProducts,orders:[]}; fs.writeFileSync(DB,JSON.stringify(d,null,2)); return d; } return JSON.parse(fs.readFileSync(DB,'utf8')); }
function writeDB(d){ fs.writeFileSync(DB,JSON.stringify(d,null,2)); }
function hash(pw,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(pw,salt,64).toString('hex')};}
let db=readDB();
if(!db.users.some(u=>u.email==='admin@vsp.com')){const p=hash(process.env.ADMIN_PASSWORD||'Admin@123');db.users.push({id:1,name:'VSP Admin',email:'admin@vsp.com',...p,role:'admin',createdAt:new Date().toISOString()});writeDB(db);}
const sessions=new Map();
function auth(req,res,next){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const userId=sessions.get(token);const user=db.users.find(u=>u.id===userId);if(!user)return res.status(401).json({message:'Please login first.'});req.user=user;next();}
function admin(req,res,next){if(req.user.role!=='admin')return res.status(403).json({message:'Admin access required.'});next();}
app.get('/api/health',(req,res)=>res.json({ok:true,project:'VSP',database:'JSON file storage'}));
app.get('/api/products',(req,res)=>res.json(db.products));
app.post('/api/register',(req,res)=>{const {name,email,password}=req.body||{};if(!name||!email||!password||password.length<6)return res.status(400).json({message:'Name, valid email and password (min 6 characters) are required.'});if(db.users.some(u=>u.email===email.toLowerCase()))return res.status(409).json({message:'Email already registered.'});const p=hash(password);const u={id:Date.now(),name:String(name).trim(),email:String(email).toLowerCase().trim(),...p,role:'customer',createdAt:new Date().toISOString()};db.users.push(u);writeDB(db);const token=crypto.randomBytes(32).toString('hex');sessions.set(token,u.id);res.status(201).json({token,user:{id:u.id,name:u.name,email:u.email,role:u.role}});});
app.post('/api/login',(req,res)=>{const {email,password}=req.body||{};const u=db.users.find(x=>x.email===String(email||'').toLowerCase().trim());if(!u||hash(password||'',u.salt).hash!==u.hash)return res.status(401).json({message:'Incorrect email or password.'});const token=crypto.randomBytes(32).toString('hex');sessions.set(token,u.id);res.json({token,user:{id:u.id,name:u.name,email:u.email,role:u.role}});});
app.get('/api/me',auth,(req,res)=>res.json({id:req.user.id,name:req.user.name,email:req.user.email,role:req.user.role}));
app.post('/api/logout',auth,(req,res)=>{const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');sessions.delete(token);res.json({message:'Logged out.'});});
app.post('/api/orders',auth,(req,res)=>{const {items,shipping}=req.body||{};if(!Array.isArray(items)||!items.length)return res.status(400).json({message:'Your cart is empty.'});if(!shipping||!shipping.name||!shipping.phone||!shipping.address)return res.status(400).json({message:'Please complete delivery details.'});const normalized=[];for(const item of items){const p=db.products.find(x=>x.id===Number(item.id));const qty=Math.floor(Number(item.qty));if(!p||!Number.isInteger(qty)||qty<1||qty>p.stock)return res.status(400).json({message:'Invalid product or quantity: '+(p?p.name:'unknown product')});normalized.push({id:p.id,name:p.name,price:p.price,qty,subtotal:p.price*qty});}const total=normalized.reduce((s,x)=>s+x.subtotal,0);const order={id:'VSP-'+Date.now().toString().slice(-8),userId:req.user.id,customer:req.user.name,email:req.user.email,shipping:{name:String(shipping.name),phone:String(shipping.phone),address:String(shipping.address)},items:normalized,total,status:'Order Placed',createdAt:new Date().toISOString()};db.orders.unshift(order);normalized.forEach(x=>{const p=db.products.find(y=>y.id===x.id);p.stock-=x.qty;});writeDB(db);res.status(201).json({message:'Order placed successfully.',order});});
app.get('/api/orders',auth,(req,res)=>res.json(db.orders.filter(o=>req.user.role==='admin'||o.userId===req.user.id)));
app.get('/api/orders/:id',auth,(req,res)=>{const o=db.orders.find(x=>x.id===req.params.id&&(req.user.role==='admin'||x.userId===req.user.id));if(!o)return res.status(404).json({message:'Order not found.'});res.json(o);});
app.get('/api/admin/stats',auth,admin,(req,res)=>res.json({products:db.products.length,orders:db.orders.length,users:db.users.filter(u=>u.role==='customer').length,revenue:db.orders.reduce((s,o)=>s+o.total,0)}));
app.post('/api/admin/products',auth,admin,(req,res)=>{const {name,category,price,stock,icon,description}=req.body||{};if(!name||!category||Number(price)<=0||Number(stock)<0)return res.status(400).json({message:'Enter valid product details.'});const p={id:Date.now(),name:String(name),category:String(category),price:Number(price),stock:Number(stock),icon:icon||'🔩',description:description||''};db.products.push(p);writeDB(db);res.status(201).json(p);});
app.put('/api/admin/products/:id',auth,admin,(req,res)=>{const p=db.products.find(x=>x.id===Number(req.params.id));if(!p)return res.status(404).json({message:'Product not found.'});const {name,category,price,stock,icon,description}=req.body||{};Object.assign(p,{name:name??p.name,category:category??p.category,price:price===undefined?p.price:Number(price),stock:stock===undefined?p.stock:Number(stock),icon:icon??p.icon,description:description??p.description});writeDB(db);res.json(p);});
app.delete('/api/admin/products/:id',auth,admin,(req,res)=>{const n=db.products.length;db.products=db.products.filter(x=>x.id!==Number(req.params.id));if(n===db.products.length)return res.status(404).json({message:'Product not found.'});writeDB(db);res.json({message:'Product deleted.'});});
app.patch('/api/admin/orders/:id/status',auth,admin,(req,res)=>{const allowed=['Order Placed','Confirmed','Packed','Shipped','Out for Delivery','Delivered','Cancelled'];const o=db.orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({message:'Order not found.'});if(!allowed.includes(req.body.status))return res.status(400).json({message:'Invalid order status.'});o.status=req.body.status;writeDB(db);res.json(o);});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`VSP is running at http://localhost:${PORT}`));
