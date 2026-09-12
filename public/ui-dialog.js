const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function shell({eyebrow='Please confirm',title,message,body='',confirmLabel='Continue',danger=false}){
 const dialog=document.createElement('dialog');
 dialog.className='finance-dialog site-dialog';
 dialog.innerHTML=`<form method="dialog"><div class="section-head"><div><p class="eyebrow">${escape(eyebrow)}</p><h2>${escape(title)}</h2></div><button type="button" class="icon-button" data-dialog-cancel aria-label="Close">×</button></div>${message?`<p class="site-dialog-message">${escape(message)}</p>`:''}${body}<p class="error" aria-live="polite"></p><div class="actions"><button type="button" class="secondary" data-dialog-cancel>Cancel</button><button value="confirm" class="${danger?'danger':''}">${escape(confirmLabel)}</button></div></form>`;
 document.body.append(dialog);
 return dialog;
}

export function confirmDialog({title='Are you sure?',message='',confirmLabel='Continue',danger=false,eyebrow}){
 return new Promise(resolve=>{const dialog=shell({title,message,confirmLabel,danger,eyebrow});let settled=false;const finish=value=>{if(settled)return;settled=true;dialog.close();dialog.remove();resolve(value)};dialog.querySelectorAll('[data-dialog-cancel]').forEach(button=>button.onclick=()=>finish(false));dialog.querySelector('form').onsubmit=event=>{event.preventDefault();finish(true)};dialog.oncancel=event=>{event.preventDefault();finish(false)};dialog.showModal()});
}

export function inputDialog({title,message='',label='Name',value='',placeholder='',confirmLabel='Save'}){
 return new Promise(resolve=>{const body=`<label>${escape(label)}<input name="value" required value="${escape(value)}" placeholder="${escape(placeholder)}"></label>`;const dialog=shell({eyebrow:'Enter details',title,message,body,confirmLabel});let settled=false;const finish=value=>{if(settled)return;settled=true;dialog.close();dialog.remove();resolve(value)};dialog.querySelectorAll('[data-dialog-cancel]').forEach(button=>button.onclick=()=>finish(null));dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const value=event.currentTarget.elements.value.value.trim();if(value)finish(value)};dialog.oncancel=event=>{event.preventDefault();finish(null)};dialog.showModal();dialog.querySelector('input').focus()});
}

export function messageDialog({title='Something went wrong',message='',confirmLabel='Close'}){
 return new Promise(resolve=>{const dialog=shell({eyebrow:'Notice',title,message,confirmLabel});dialog.querySelector('.actions .secondary').remove();const finish=()=>{dialog.close();dialog.remove();resolve()};dialog.querySelectorAll('[data-dialog-cancel]').forEach(button=>button.onclick=finish);dialog.querySelector('form').onsubmit=event=>{event.preventDefault();finish()};dialog.showModal()});
}

const nativeConfirmSelectors='[data-delete-meeting],[data-delete-document],[data-delete-loi],[data-delete-asset],[data-delete-pdf],#delete-letter-template';
document.addEventListener('click',async event=>{
 const button=event.target.closest(nativeConfirmSelectors);
 if(!button||button.dataset.siteConfirmed==='true')return;
 event.preventDefault();event.stopImmediatePropagation();
 const label=button.closest('.document-row,.recent-pdf,.asset-card,tr')?.querySelector('b')?.textContent||'This item';
 if(!await confirmDialog({title:'Delete this item?',message:`${label} will be permanently removed.`,confirmLabel:'Delete',danger:true}))return;
 button.dataset.siteConfirmed='true';
 const original=window.confirm;window.confirm=()=>true;
 try{button.click()}finally{window.confirm=original;delete button.dataset.siteConfirmed}
},true);
