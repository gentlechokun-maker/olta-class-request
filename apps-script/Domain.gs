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
function classCurriculum(c,semester=2){if(c.grade==='중3'&&c.title==='중3 내신대비반'||c.grade==='중2'&&c.title==='물리대회 대비반 물리학')return {name:c.title,minutes:120,lesson:'이론 주 1회 · 2시간'};if(c.grade==='중3'&&c.title==='통합과학')return {name:'통합과학',minutes:120,lesson:'이론 주 1회 · 2시간'};return curriculum(c.grade,c.day,semester);}
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
function classCapacity(c){return c.grade!=='초6'&&(c.lessonType==='theory'||['중1','중2','중3','고1','고2','고3'].includes(c.grade))?12:6;}
function makeupCapacity(type,grade){return type==='theory'&&grade!=='초6'?12:6;}
function capacity(counts,limit=6){const used=Number(counts.registered||0)+Number(counts.starting||0);return {used,remaining:Math.max(0,limit-used),over:used>limit};}
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

// Only administrator-approved windows are candidates. An empty timetable cell
// does not establish working hours. Unknown resources must never imply free time.
function openingSlotAvailable(slot,classes){
  const validTime=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s||'');
  const tokens=s=>String(s||'').replace(/\([^)]*\)/g,'').split(/[\s,·/→]+/).filter(Boolean);
  if(!['월','화','수','목','금','토','일'].includes(slot.day)||!validTime(slot.start)||!validTime(slot.end)||slot.start>=slot.end||slot.end>'22:00'||!slot.room)return false;
  const dayClasses=classes.filter(c=>c.day===slot.day);
  if(dayClasses.some(c=>!validTime(c.start)||!validTime(c.end)||c.start>=c.end))return false;
  const busy=dayClasses.filter(c=>slot.start<c.end&&c.start<slot.end);
  if(busy.some(c=>!c.teacher||!c.room||/확인|미정/.test(c.teacher+' '+c.room)))return false;
  if(busy.some(c=>tokens(c.room).some(room=>tokens(slot.room).includes(room))))return false;
  return (slot.teachers||['신T','홍T']).some(t=>['신T','홍T'].includes(t)&&!(t==='신T'&&slot.day==='수')&&!(t==='홍T'&&slot.day==='금')&&!busy.some(c=>tokens(c.teacher).includes(t)));
}

// Explicitly supplied opening windows, 2026-10-16. Never infer working hours
// from blank cells. Single start times are one-hour windows; 'after' ends at 22.
const OPENING_WINDOWS = [
 ['월',15,16,['홍T']],['월',20,22,['신T','홍T']],
 ['화',16,17,['홍T','신T']],['화',17,18,['신T']],['화',20,22,['홍T']],
 ['수',19,22,['홍T']],['목',14,15,['신T']],['목',16,17,['신T']],['목',19,22,['홍T']],
 ['토',12,13,['신T']],['토',17,22,['신T','홍T']],
 ['일',10,11,['홍T']],['일',11,12,['홍T']],['일',14,22,['홍T']]
];
function generateOpeningSlots(classes,semester=2){
 const rooms=[...new Set(classes.flatMap(c=>String(c.room||'').match(/\d+교실/g)||[]))].sort();
 const fmt=h=>String(h).padStart(2,'0')+':00',days=['월','화','수','목','금','토','일'],out=[];
 for(const day of days)for(let hour=0;hour<22;hour++)for(const length of [1,2,3]){
   if(hour+length>22)continue;
   const teachers=['신T','홍T'].filter(t=>Array.from({length},(_,i)=>hour+i).every(h=>OPENING_WINDOWS.some(w=>w[0]===day&&w[1]<=h&&w[2]>=h+1&&w[3].includes(t))));
   if(!teachers.length)continue;
   const grades=COURSE_GRADES.filter(g=>(curriculum(g,day,semester)?.minutes||(g==='고1'?120:0))===length*60);
   if(!grades.length)continue;
   const slot={id:'opening-'+days.indexOf(day)+'-'+hour+'-'+length,day,start:fmt(hour),end:fmt(hour+length),teachers};
   const room=rooms.find(room=>openingSlotAvailable({...slot,room},classes));
   if(room)out.push({id:slot.id,day,start:slot.start,end:slot.end,room,grades});
 }
 return out;
}

// A makeup sits immediately before/after the student's regular class.
function makeupWindow(cls,type,position){
  const minutes=type==='experiment'?30:type==='theory'?60:0;
  const parse=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'')?Number(t.slice(0,2))*60+Number(t.slice(3)):NaN;
  const start=parse(cls.start),end=parse(cls.end);
  if(!minutes||!['before','after'].includes(position)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end>1320)throw new Error('수업 시간과 보강 종류를 확인해 주세요.');
  const from=position==='before'?start-minutes:end,to=from+minutes;
  if(from<0||to>1320)throw new Error('보강 수업은 오후 10시까지 끝나야 합니다.');
  const format=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  return {start:format(from),end:format(to),minutes};
}
function validateMakeup(input,catalog,now=new Date()){
  const cls=catalog.classes.find(c=>c.id===input.targetId);
  if(!cls||cls.review)throw new Error('정규 수업 시간표를 먼저 확인해 주세요.');
  // Reuse contact/consent checks, without applying the regular class seat limit.
  const base=validateRequest({...input,kind:'existing'},{classes:[{...cls,remaining:1}],slots:[]});
  const window=makeupWindow(cls,input.makeupType,input.position),date=String(input.date||'');
  const instant=new Date(date+'T'+window.start+':00+09:00');
  const noon=new Date(date+'T12:00:00+09:00');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(noon.getTime())||noon.toISOString().slice(0,10)!==date||['일','월','화','수','목','금','토'][noon.getUTCDay()]!==cls.day)throw new Error('정규 수업 요일에 맞는 보강 날짜를 선택해 주세요.');
  if(instant.getTime()<=now.getTime())throw new Error('이미 지난 보강 시간은 신청할 수 없습니다.');
  const absenceDate=String(input.absenceDate||''),missedTopic=String(input.missedTopic||'').trim();
  const absence=new Date(absenceDate+'T12:00:00+09:00'),today=new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(absenceDate)||!Number.isFinite(absence.getTime())||absence.toISOString().slice(0,10)!==absenceDate||absenceDate>today||absenceDate>date)throw new Error('실제로 결석한 수업 날짜를 입력해 주세요.');
  if(missedTopic.length<2||missedTopic.length>200)throw new Error('결석한 수업 내용을 2~200자로 입력해 주세요. 모르면 확인 요청으로 적어주세요.');
  return {...base,kind:'makeup',date,absenceDate,missedTopic,makeupType:input.makeupType,position:input.position,...window};
}
