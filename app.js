import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const $=id=>document.getElementById(id);
const setup=$("setup"),auth=$("auth"),chat=$("chat");
let supabase,currentUser,channel,isSignup=false,selectedImage=null,noticeTimer;
function notify(m){const e=$("notice");e.textContent=m;e.classList.add("show");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>e.classList.remove("show"),4500)}
function setConnection(t){$("connection").textContent=t}
function show(v){setup.classList.toggle("hidden",v!=="setup");auth.classList.toggle("hidden",v!=="auth");chat.classList.toggle("hidden",v!=="chat")}
function setAuthMode(s){isSignup=s;$("signupTab").classList.toggle("active",s);$("loginTab").classList.toggle("active",!s);$("nameLabel").classList.toggle("hidden",!s);$("displayName").classList.toggle("hidden",!s);$("displayName").required=s;$("authSubmit").textContent=s?"ساخت حساب":"ورود";$("password").autocomplete=s?"new-password":"current-password"}
function renderMessage(m){
 const empty=$("messages").querySelector(".empty");if(empty)empty.remove();
 const a=document.createElement("article");a.className="message"+(m.user_id===currentUser?.id?" mine":"");
 const meta=document.createElement("div");meta.className="message-meta";const n=document.createElement("strong");n.textContent=String(m.username||"کاربر");
 const t=document.createElement("time");t.textContent=new Date(m.created_at).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"});meta.append(n,t);a.append(meta);
 if(m.content){const p=document.createElement("p");p.textContent=String(m.content);a.append(p)}
 if(m.image_url){const img=document.createElement("img");img.src=m.image_url;img.alt="تصویر ارسال‌شده";img.loading="lazy";a.append(img)}
 $("messages").append(a);$("messages").scrollTop=$("messages").scrollHeight;
}
async function loadMessages(){
 $("messages").innerHTML='<div class="empty">در حال دریافت پیام‌ها...</div>';
 const {data,error}=await supabase.from("messages").select("*").order("created_at",{ascending:true}).limit(100);
 if(error)throw error;$("messages").innerHTML="";
 if(!data?.length)$("messages").innerHTML='<div class="empty">هنوز پیامی نیست. اولین پیام را بفرست!</div>';else data.forEach(renderMessage);
}
function subscribeMessages(){if(channel)supabase.removeChannel(channel);channel=supabase.channel("public-chat-room").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},p=>renderMessage(p.new)).subscribe()}
async function enterApp(u){currentUser=u;const name=u.user_metadata?.display_name||u.email?.split("@")[0]||"کاربر";$("whoAmI").textContent="واردشده با نام "+name;show("chat");await loadMessages();subscribeMessages();setConnection("متصل")}
async function connect(url,key){
 supabase=createClient(url,key);const {data,error}=await supabase.auth.getSession();if(error)throw error;
 localStorage.setItem("ff_supabase_url",url);localStorage.setItem("ff_supabase_key",key);show("auth");setConnection("سرور متصل شد");
 if(data.session?.user)await enterApp(data.session.user);
 supabase.auth.onAuthStateChange((_e,s)=>{if(s?.user)enterApp(s.user).catch(x=>notify(x.message));else{currentUser=null;if(channel)supabase.removeChannel(channel);show("auth")}});
}
$("saveConfig").addEventListener("click",async()=>{
 const u=$("supabaseUrl").value.trim().replace(/\/$/,""),k=$("supabaseKey").value.trim();if(!u||!k)return notify("آدرس و کلید عمومی را وارد کن.");
 try{$("saveConfig").disabled=true;await connect(u,k)}catch(e){notify("اتصال ناموفق بود: "+e.message)}finally{$("saveConfig").disabled=false}
});
$("loginTab").addEventListener("click",()=>setAuthMode(false));$("signupTab").addEventListener("click",()=>setAuthMode(true));setAuthMode(false);
$("editConfig").addEventListener("click",()=>{$("supabaseUrl").value=localStorage.getItem("ff_supabase_url")||"";$("supabaseKey").value=localStorage.getItem("ff_supabase_key")||"";show("setup")});
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();const email=$("email").value.trim(),password=$("password").value,b=$("authSubmit");b.disabled=true;
 try{
  if(isSignup){const displayName=$("displayName").value.trim();const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:displayName}}});if(error)throw error;notify(data.session?"حساب ساخته شد.":"ثبت‌نام انجام شد؛ اگر تأیید ایمیل فعال است، ایمیلت را بررسی کن.")}
  else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}
 }catch(x){notify(x.message)}finally{b.disabled=false}
});
$("logout").addEventListener("click",async()=>{const {error}=await supabase.auth.signOut();if(error)notify(error.message)});
$("imageFile").addEventListener("change",e=>{
 selectedImage=e.target.files?.[0]||null;$("fileName").textContent=selectedImage?selectedImage.name:"";
 if(selectedImage&&(!selectedImage.type.startsWith("image/")||selectedImage.size>5*1024*1024)){notify("فقط عکس با حجم حداکثر ۵ مگابایت مجاز است.");selectedImage=null;e.target.value="";$("fileName").textContent=""}
});
$("messageForm").addEventListener("submit",async e=>{
 e.preventDefault();const content=$("messageText").value.trim();if(!content&&!selectedImage)return notify("متن یا عکسی برای ارسال وارد کن.");
 const b=$("send");b.disabled=true;
 try{
  let image_url=null;
  if(selectedImage){const safe=selectedImage.name.replace(/[^a-zA-Z0-9._-]/g,"_"),path=currentUser.id+"/"+crypto.randomUUID()+"-"+safe;
   const {error}=await supabase.storage.from("chat-images").upload(path,selectedImage,{contentType:selectedImage.type,upsert:false});if(error)throw error;
   image_url=supabase.storage.from("chat-images").getPublicUrl(path).data.publicUrl;
  }
  const username=currentUser.user_metadata?.display_name||currentUser.email?.split("@")[0]||"کاربر";
  const {error}=await supabase.from("messages").insert({user_id:currentUser.id,username,content:content||null,image_url});if(error)throw error;
  $("messageText").value="";$("imageFile").value="";$("fileName").textContent="";selectedImage=null;
 }catch(x){notify("ارسال انجام نشد: "+x.message)}finally{b.disabled=false}
});
(async()=>{
 const u=localStorage.getItem("ff_supabase_url"),k=localStorage.getItem("ff_supabase_key");
 if(u&&k){$("supabaseUrl").value=u;$("supabaseKey").value=k;try{await connect(u,k)}catch(e){show("setup");setConnection("اتصال برقرار نشد");notify("اتصال ناموفق بود: "+e.message)}}else show("setup");
})();
