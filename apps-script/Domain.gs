// Generated from public/domain.js by npm run build.
const GRADES = ['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1'];
const COURSE_GRADES = [...GRADES];
function courseGrade(grade){return grade;}
function gradeLabel(grade){return grade;}
function studentGrades(groups){return [...new Set(groups)].filter(g=>GRADES.includes(g));}
function curriculum(grade,day,semester=2){
  const elementary={'초1':'빅뱅','초2':'빅뱅','초3':'아톰 1','초4':'아톰 2','초5':'퀀텀 1','초6':'퀀텀 2'};
  if(elementary[grade])return {name:elementary[grade],minutes:grade==='초6'?120:60,lesson:grade==='초6'?'실험 1시간 + 이론 1시간':'주 1회 · 1시간'};
  if(grade==='중3'&&day==='토')return {name:'통합과학',minutes:120,lesson:'주 1회 · 2시간'};
  if(grade==='중1'||grade==='중2'&&Number(semester)===1)return {name:'니들',minutes:120,lesson:'이론 주 1회 · 2시간'};
  if(grade==='중2'||grade==='중3')return {name:'스레드',minutes:180,lesson:'이론 주 1회 · 3시간'};
  return null;
}
function durationMinutes(start,end){const minutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};return minutes(end)-minutes(start);}
const STATUS = {registered:'확정 등록',paused:'임시 휴원',makeup:'보강',consultation:'상담 요청',starting:'시작 예정'};
const PALETTE = {
  '#000000':'registered','#ff0000':'paused','#cc0000':'paused','#e06666':'paused',
  '#0000ff':'makeup','#3c78d8':'makeup','#1155cc':'makeup',
  '#008000':'consultation','#00ff00':'consultation','#38761d':'consultation','#6aa84f':'consultation',
  '#800080':'starting','#9900ff':'starting','#a64d79':'starting','#674ea7':'starting','#8e7cc3':'starting'
};
function normalizePhone(value){ return String(value||'').replace(/[^0-9]/g,'').replace(/^82(10)/,'0$1'); }
function normalizeName(value){return String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ');}
function capacity(counts){const used=Number(counts.registered||0)+Number(counts.starting||0);return {used,remaining:Math.max(0,6-used),over:used>6};}
function parseColoredCell(text,runs,palette=PALETTE){
  const people=[],issues=[];
  if(!text.trim())return {people,issues};
  const source=text.replace(/\([^)]*\)/g,match=>' '.repeat(match.length));
  const tokens=[...source.matchAll(/[^\s,;\[\]]+/g)];
  for(const match of tokens){
    const name=match[0];
    if(!/^[가-힣]{2,5}$/.test(name)||/^(휴원|보강|상담|예정|대기|시작|등록|퇴원|선생님|친구들|확인|모집|연락|초등|중등|정원|있음|없음|정상|정상진행)$/.test(name)){issues.push('이름 이외의 내용 확인: '+name);continue;}
    const colors=new Set();
    for(let i=match.index;i<match.index+name.length;i++){
      const run=runs.find(r=>r.start<=i&&r.end>i);
      colors.add(String(run?.color||'#000000').toLowerCase());
    }
    if(colors.size!==1){issues.push('이름 내부 글자색 혼합: '+name);continue;}
    const color=[...colors][0],status=palette[color];
    if(!status){issues.push('미지정 글자색 '+color+': '+name);continue;}
    people.push({name,status,color});
  }
  return {people,issues};
}
function validateRequest(input,catalog){
  const kind=String(input.kind||''),student=normalizeName(input.student),phone=normalizePhone(input.phone),grade=String(input.grade||'');
  if(input.website)throw new Error('신청을 처리할 수 없습니다.');
  if(!['existing','new'].includes(kind)||!GRADES.includes(grade))throw new Error('신청 종류와 학년을 확인해 주세요.');
  if(student.length<2||student.length>30||/[<>\r\n]/.test(student))throw new Error('원생 이름을 확인해 주세요.');
  if(!/^01[016789]\d{7,8}$/.test(phone))throw new Error('보호자의 휴대전화 번호를 확인해 주세요.');
  if(input.consent!=='yes')throw new Error('개인정보 수집·이용 동의가 필요합니다.');
  if(input.privacyVersion!=='2026-10-13')throw new Error('신청 화면을 새로고침해 주세요.');
  if(!/^[a-zA-Z0-9-]{16,64}$/.test(String(input.requestId||'')))throw new Error('신청 화면을 다시 열어 주세요.');
  const target=(kind==='existing'?catalog.classes:catalog.slots).find(c=>c.id===input.targetId);
  if(!target)throw new Error('현재 신청할 수 없는 시간입니다. 새로고침해 주세요.');
  if(kind==='existing'&&(courseGrade(target.grade)!==courseGrade(grade)||target.review||target.remaining<1))throw new Error('현재 상담 신청이 가능한 반인지 다시 확인해 주세요.');
  if(kind==='new'&&!target.grades.map(courseGrade).includes(courseGrade(grade)))throw new Error('이 시간대의 신청 가능 학년을 확인해 주세요.');
  const note=String(input.note||'').trim();if(note.length>300)throw new Error('참고 내용은 300자 이내로 입력해 주세요.');
  return {kind,targetId:target.id,student,phone,grade,note,requestId:String(input.requestId)};
}
function aggregateDemand(requests){
  const groups={};
  for(const r of requests){if(r.kind!=='new'||!['접수','상담 중'].includes(r.status))continue;
    if(!GRADES.includes(r.grade))continue;
    const key=r.targetId+'|'+courseGrade(r.grade);
    if (!groups[key]) groups[key] = new Set();
    groups[key].add(normalizeName(r.student)+'|'+normalizePhone(r.phone));
  }
  return Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.size]));
}
function overlaps(a,b){return a.day===b.day&&a.room===b.room&&a.start<b.end&&b.start<a.end;}
