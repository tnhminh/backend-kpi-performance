const jiraFieldOptions=[
  {key:'key',label:'Mã issue'},
  {key:'summary',label:'Tiêu đề'},
  {key:'member',label:'Assignee'},
  {key:'issueType',label:'Loại issue'},
  {key:'status',label:'Trạng thái'},
  {key:'priority',label:'Độ ưu tiên'},
  {key:'labels',label:'Labels'},
  {key:'storyPoints',label:'Story Point'},
  {key:'deadline',label:'Deadline'},
  {key:'created',label:'Ngày tạo'},
  {key:'updated',label:'Cập nhật lần cuối'}
];
const jiraFieldStorageKey='kpi-jira-visible-fields';
const jiraFieldDefaults=['key','summary','member','status','priority','labels','storyPoints','deadline'];
function jiraVisibleFields(){try{const value=JSON.parse(localStorage.getItem(jiraFieldStorageKey)||'null');return Array.isArray(value)&&value.length?value:jiraFieldDefaults.slice()}catch{return jiraFieldDefaults.slice()}}
function jiraFieldEscape(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function jiraFieldValue(task,key){
  const value=key==='member'?task.member||'Chưa gán assignee':key==='labels'?(task.labels||[]).join(', ')||'Không có label':key==='status'?(task.done?'Done':task.status||'Open'):task[key];
  if(value===null||value===undefined||value==='')return '—';
  return jiraFieldEscape(value);
}
function renderJiraFieldPicker(selected){
  return `<details class="jira-field-picker"><summary>Chọn field hiển thị <span>${selected.length}/${jiraFieldOptions.length}</span></summary><div class="jira-field-menu">${jiraFieldOptions.map(field=>`<label><input type="checkbox" data-jira-field="${field.key}" ${selected.includes(field.key)?'checked':''}><span>${field.label}</span></label>`).join('')}<button type="button" class="btn btn-ghost jira-field-reset">Khôi phục mặc định</button></div></details>`;
}
function renderJiraTasksWithFields(){
  const root=document.querySelector('#jiraTasksRoot');if(!root)return;
  const tasks=state.jiraIssues||[],selected=jiraVisibleFields();
  root.innerHTML=`<div class="jira-task-toolbar"><input id="jiraTaskSearch" placeholder="Tìm mã task, tiêu đề hoặc member"><select id="jiraTaskStatus"><option value="all">Tất cả trạng thái</option><option value="done">Done</option><option value="open">Chưa hoàn thành</option></select><span>${tasks.length} task</span>${renderJiraFieldPicker(selected)}</div><div class="jira-task-list">${tasks.length?tasks.map(task=>{
    const searchable=jiraFieldOptions.map(field=>jiraFieldValue(task,field.key)).join(' ');
    const identity=selected.filter(key=>key==='key'||key==='summary');
    const metadata=selected.filter(key=>key!=='key'&&key!=='summary');
    return `<div class="jira-task-row" data-task-search="${jiraFieldEscape(`${task.key||''} ${task.title||''} ${task.member||''} ${searchable}`.toLowerCase())}" data-task-status="${task.done?'done':'open'}"><div class="jira-task-main">${identity.map(key=>`<div class="jira-task-field jira-field-${key}"><small>${jiraFieldOptions.find(field=>field.key===key)?.label||key}</small><strong>${jiraFieldValue(task,key)}</strong></div>`).join('')}</div><div class="jira-task-fields">${metadata.map(key=>`<div class="jira-task-field jira-field-${key}"><small>${jiraFieldOptions.find(field=>field.key===key)?.label||key}</small><span>${jiraFieldValue(task,key)}</span></div>`).join('')}</div><a class="jira-task-open" href="${jiraFieldEscape(task.url||'#')}" target="_blank" rel="noopener">Mở ↗</a></div>`;
  }).join(''):'<div class="jira-empty"><b>Chưa có task Jira</b><span>Vào Cài đặt, nhập token và bấm Đồng bộ Jira Data Center.</span></div>'}</div>`;
  const filter=()=>{const q=(root.querySelector('#jiraTaskSearch')?.value||'').toLowerCase(),status=root.querySelector('#jiraTaskStatus')?.value||'all';root.querySelectorAll('.jira-task-row').forEach(row=>row.hidden=!(row.dataset.taskSearch.includes(q)&&(status==='all'||row.dataset.taskStatus===status)))};
  root.querySelector('#jiraTaskSearch')?.addEventListener('input',filter);root.querySelector('#jiraTaskStatus')?.addEventListener('change',filter);
  root.querySelectorAll('[data-jira-field]').forEach(input=>input.addEventListener('change',()=>{const next=[...root.querySelectorAll('[data-jira-field]:checked')].map(item=>item.dataset.jiraField);if(!next.length){input.checked=true;toast('Cần giữ lại ít nhất một field');return}localStorage.setItem(jiraFieldStorageKey,JSON.stringify(next));renderJiraTasksWithFields()}));
  root.querySelector('.jira-field-reset')?.addEventListener('click',()=>{localStorage.setItem(jiraFieldStorageKey,JSON.stringify(jiraFieldDefaults));renderJiraTasksWithFields()});
}
renderJiraTasks=renderJiraTasksWithFields;
if(typeof activeModule!=='undefined'&&activeModule==='jiraTasks')renderJiraTasksWithFields();
