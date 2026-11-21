import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL="https://qdjgkynzbeypogvihsbx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_rdVhXue0W1uT_6VXppj3pw_YQGbXzkD";
const $=id=>document.getElementById(id);
const setup=$("setup"),auth=$("auth"),chat=$("chat");
let supabase,currentUser,channel,isSignup=false,selectedImage=null,noticeTimer,chatMode="public",privateRecipient=null;
function notify(m){const e=$("notice");e.textContent=m;e.classList.add("show");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>e.classList.remove("show"),4500)}
function setConnection(t){$("connection").textContent=t}
function usernameEmail(name){const slug=Array.from(name.trim().toLocaleLowerCase("fa")).map(c=>c.codePointAt(0).toString(16)).join("-");return slug+"@users.hamsobat.invalid";}
function show(v){setup.classList.toggle("hidden",v!=="setup");auth.classList.toggle("hidden",v!=="auth");chat.classList.toggle("hidden",v!=="chat")}
function setAuthMode(s){isSignup=s;$("signupTab").classList.toggle("active",s);$("loginTab").classList.toggle("active",!s);$("authSubmit").textContent=s?"ساخت حساب":"ورود";$("password").autocomplete=s?"new-password":"current-password"}
function myName(){return currentUser.user_metadata?.username||currentUser.user_metadata?.display_name||"کاربر"}
function renderMessage(m){
 const empty=$("messages").querySelector(".empty");if(empty)empty.remove();
 const a=document.createElement("article");a.className="message"+(m.sender_id===currentUser?.id||m.user_id===currentUser?.id?" mine":"");
 const meta=document.createElement("div");meta.className="message-meta";const n=document.createElement("strong");n.textContent=String(m.sender_username||m.username||"کاربر");
 const t=document.createElement("time");t.textContent=new Date(m.created_at).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"});meta.append(n,t);a.append(meta);
 if(m.content){const p=document.createElement("p");p.textContent=String(m.content);a.append(p)}
 if(m.image_url){const img=document.createElement("img");img.src=m.image_url;img.alt="تصویر ارسال‌شده";img.loading="lazy";a.append(img)}
 $("messages").append(a);$("messages").scrollTop=$("messages").scrollHeight;
}
function emptyMessages(msg){$("messages").innerHTML='<div class="empty">'+msg+'</div>'}
async function loadMessages(){
 emptyMessages("در حال دریافت پیام‌ها...");
 let query;
 if(chatMode==="public") query=supabase.from("messages").select("*").order("created_at",{ascending:true}).limit(100);
 else {
  if(!privateRecipient){emptyMessages("برای شروع، نام کاربری شخص موردنظر را وارد کن.");return}
  query=supabase.from("direct_messages").select("*").or("and(sender_id.eq."+currentUser.id+",recipient_id.eq."+privateRecipient.id+"),and(sender_id.eq."+privateRecipient.id+",recipient_id.eq."+currentUser.id+")").order("created_at",{ascending:true}).limit(100);
 }
 const {data,error}=await query;if(error)throw error;$("messages").innerHTML="";
 if(!data?.length)emptyMessages("هنوز پیامی در این گفتگو نیست.");else data.forEach(renderMessage);
}
function subscribeMessages(){
 if(channel)supabase.removeChannel(channel);
 if(chatMode==="public"){
  channel=supabase.channel("public-chat-room").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},p=>{if(chatMode==="public")renderMessage(p.new)}).subscribe();
 }else{
  channel=supabase.channel("private-chat-"+currentUser.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages"},p=>{
   const m=p.new,ids=[currentUser.id,privateRecipient?.id];
   if(chatMode==="private"&&privateRecipient&&ids.includes(m.sender_id)&&ids.includes(m.recipient_id))renderMessage(m);
  }).subscribe();
 }
}
function setChatMode(mode){
 chatMode=mode;$("publicMode").classList.toggle("active",mode==="public");$("privateMode").classList.toggle("active",mode==="private");
 $("publicTools").classList.toggle("hidden",mode!=="public");$("privateTools").classList.toggle("hidden",mode!=="private");
 $("messageForm").classList.toggle("hidden",mode==="private"&&!privateRecipient);
 $("imageFile").parentElement.classList.toggle("hidden",mode==="private");
 $("chatHint").textContent=mode==="public"?"پیام‌ها و عددهای این بخش برای همه کاربران قابل مشاهده‌اند.":"این گفتگو فقط بین شما و شخص انتخاب‌شده قابل مشاهده است.";
 if(mode==="private"&&!privateRecipient)emptyMessages("برای شروع، نام کاربری شخص موردنظر را وارد کن.");
 if(currentUser){loadMessages().catch(e=>notify(e.message));subscribeMessages()}
}
async function enterApp(u){currentUser=u;const name=myName();$("whoAmI").textContent="واردشده با نام "+name;show("chat");await loadMessages();subscribeMessages();setConnection("متصل")}
async function connect(url,key){
 supabase=createClient(url,key);const {data,error}=await supabase.auth.getSession();if(error)throw error;
 localStorage.setItem("ff_supabase_url",url);localStorage.setItem("ff_supabase_key",key);show("auth");setConnection("سرور متصل شد");
 if(data.session?.user)await enterApp(data.session.user);
 supabase.auth.onAuthStateChange((_e,s)=>{if(s?.user)enterApp(s.user).catch(x=>notify(x.message));else{currentUser=null;privateRecipient=null;if(channel)supabase.removeChannel(channel);show("auth")}});
}
$("saveConfig").addEventListener("click",async()=>{const u=$("supabaseUrl").value.trim().replace(/\/$/,""),k=$("supabaseKey").value.trim();if(!u||!k)return notify("آدرس و کلید عمومی را وارد کن.");try{$("saveConfig").disabled=true;await connect(u,k)}catch(e){notify("اتصال ناموفق بود: "+e.message)}finally{$("saveConfig").disabled=false}});
$("loginTab").addEventListener("click",()=>setAuthMode(false));$("signupTab").addEventListener("click",()=>setAuthMode(true));setAuthMode(false);
$("editConfig").addEventListener("click",()=>{$("supabaseUrl").value=localStorage.getItem("ff_supabase_url")||"";$("supabaseKey").value=localStorage.getItem("ff_supabase_key")||"";show("setup")});
$("authForm").addEventListener("submit",async e=>{e.preventDefault();const username=$("username").value.trim(),password=$("password").value,b=$("authSubmit");b.disabled=true;try{if(!username||username.length<3)throw new Error("نام کاربری باید حداقل ۳ حرف باشد.");const email=usernameEmail(username);if(isSignup){const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:username,username}}});if(error)throw error;if(!data.session){notify("ثبت‌نام انجام شد؛ برای ورود بدون ایمیل، مدیر باید تأیید ایمیل را در تنظیمات Supabase خاموش کند.");return}notify("حساب ساخته شد و وارد شد.")}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw new Error("نام کاربری یا رمز عبور اشتباه است.")}}catch(x){notify(x.message)}finally{b.disabled=false}});
$("publicMode").addEventListener("click",()=>setChatMode("public"));$("privateMode").addEventListener("click",()=>setChatMode("private"));
$("recipientForm").addEventListener("submit",async e=>{
 e.preventDefault();const name=$("recipientName").value.trim();if(!name)return notify("نام کاربری را وارد کن.");
 const b=e.submitter;b.disabled=true;
 try{
  const {data,error}=await supabase.from("profiles").select("id,username").ilike("username",name).limit(2);
  if(error)throw error;if(!data?.length)throw new Error("این نام کاربری پیدا نشد؛ مطمئن شو طرف مقابل قبلاً ثبت‌نام کرده است.");
  if(data.length>1)throw new Error("چند حساب با این نام وجود دارد؛ نام دقیق نمایش‌داده‌شده را وارد کن.");
  if(data[0].id===currentUser.id)throw new Error("نمی‌توانی به خودت پیام بدهی.");
  privateRecipient=data[0];$("privateWith").textContent="گفتگوی خصوصی با "+privateRecipient.username;$("messageForm").classList.remove("hidden");await loadMessages();subscribeMessages();
 }catch(x){notify(x.message)}finally{b.disabled=false}
});
$("numberForm").addEventListener("submit",async e=>{e.preventDefault();const value=$("numberValue").value.trim();if(value===""||!Number.isFinite(Number(value)))return notify("یک عدد معتبر وارد کن.");const b=$("sendNumber");b.disabled=true;try{const {error}=await supabase.from("messages").insert({user_id:currentUser.id,username:myName(),content:"🔢 عدد ثبت‌شده: "+value,image_url:null});if(error)throw error;$("numberValue").value=""}catch(x){notify("ارسال عدد انجام نشد: "+x.message)}finally{b.disabled=false}});
$("logout").addEventListener("click",async()=>{const {error}=await supabase.auth.signOut();if(error)notify(error.message)});
$("imageFile").addEventListener("change",e=>{selectedImage=e.target.files?.[0]||null;$("fileName").textContent=selectedImage?selectedImage.name:"";if(selectedImage&&(!selectedImage.type.startsWith("image/")||selectedImage.size>5*1024*1024)){notify("فقط عکس با حجم حداکثر ۵ مگابایت مجاز است.");selectedImage=null;e.target.value="";$("fileName").textContent=""}});
$("messageForm").addEventListener("submit",async e=>{
 e.preventDefault();const content=$("messageText").value.trim();if(!content&&!selectedImage)return notify("متن یا عکسی برای ارسال وارد کن.");
 const b=$("send");b.disabled=true;
 try{
  if(chatMode==="private"){
   if(!privateRecipient)throw new Error("اول یک مخاطب انتخاب کن.");
   if(selectedImage)throw new Error("ارسال عکس در گفتگوی خصوصی فعلاً فعال نیست؛ فقط متن بفرست.");
   const {error}=await supabase.from("direct_messages").insert({sender_id:currentUser.id,recipient_id:privateRecipient.id,sender_username:myName(),content});
   if(error)throw error;
  }else{
   let image_url=null;
   if(selectedImage){const safe=selectedImage.name.replace(/[^a-zA-Z0-9._-]/g,"_"),path=currentUser.id+"/"+crypto.randomUUID()+"-"+safe;const {error}=await supabase.storage.from("chat-images").upload(path,selectedImage,{contentType:selectedImage.type,upsert:false});if(error)throw error;image_url=supabase.storage.from("chat-images").getPublicUrl(path).data.publicUrl;}
   const {error}=await supabase.from("messages").insert({user_id:currentUser.id,username:myName(),content:content||null,image_url});if(error)throw error;
  }
  $("messageText").value="";$("imageFile").value="";$("fileName").textContent="";selectedImage=null;
 }catch(x){notify("ارسال انجام نشد: "+x.message)}finally{b.disabled=false}
});
(async()=>{const u=localStorage.getItem("ff_supabase_url")||SUPABASE_URL,k=localStorage.getItem("ff_supabase_key")||SUPABASE_PUBLISHABLE_KEY;$("supabaseUrl").value=u;$("supabaseKey").value=k;try{await connect(u,k)}catch(e){show("setup");setConnection("اتصال برقرار نشد");notify("اتصال ناموفق بود: "+e.message)}})();
