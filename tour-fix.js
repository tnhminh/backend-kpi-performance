// Guided tour module routing fix.
const guidedTourSteps=[
  {module:'dashboard',target:'stats',title:'Bức tranh tổng quan',text:'Bốn ô phía trên cho biết số member, điểm trung bình, số người đạt A/A+ và tổng thưởng/trừ của phạm vi đang lọc.'},
  {module:'evaluation',target:'groupTabs',title:'Chọn phạm vi đánh giá',text:'Chọn team, tab Leader hoặc So sánh liên nhóm để thay đổi dữ liệu đang xem.'},
  {module:'evaluation',target:'rankingBody',title:'Bảng xếp hạng',text:'Bấm vào một member trong bảng để mở chi tiết đánh giá và nhập điểm cho từng tiêu chí.'},
  {module:'evaluation',target:'editor',title:'Công thức chi tiết',text:'Panel chi tiết giải thích điểm đạt, điểm nền, thưởng/trừ, xếp hạng và hệ số KPI.'},
  {module:'demo',target:'demoCard',title:'Trình giả lập',text:'Dùng dữ liệu CMS/API mẫu để thay đổi task, effort và KPI; hệ thống sẽ tính fairness score ngay lập tức.'}
];
tourShow=function(){
  const back=document.querySelector('#tourBackdrop'),step=guidedTourSteps[tourIndex];
  if(!step)return;
  if(activeModule!==step.module)setModule(step.module);
  if(step.target==='editor'&&!selectedId){selectedId=members[0]?.id||null;render()}
  const target=document.querySelector('#'+step.target);
  document.querySelector('#tourStep').textContent=`BƯỚC ${tourIndex+1} / ${guidedTourSteps.length}`;
  document.querySelector('#tourTitle').textContent=step.title;
  document.querySelector('#tourText').textContent=step.text;
  document.querySelector('#tourPrev').style.visibility=tourIndex?'visible':'hidden';
  document.querySelector('#tourNext').textContent=tourIndex===guidedTourSteps.length-1?'Hoàn tất':'Tiếp theo';
  document.querySelectorAll('.tour-highlight').forEach(x=>x.classList.remove('tour-highlight'));
  if(target){target.classList.add('tour-highlight');target.scrollIntoView({behavior:'smooth',block:'center'})}
  back.classList.remove('hidden');
};
