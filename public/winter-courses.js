// Public course rules; no teacher or student records belong here.
export function winter2027Course(c){
  const specials={
    'special2027-debate-3':{title:'초3 올치 토론·창의력 특강',period:'2027년 1~2월',grades:['초3']},
    'special2027-debate-4':{title:'초4 올치 토론·창의력 특강',period:'2027년 1~2월',grades:['초4']},
    'special2027-debate-56':{title:'초5·초6 올치 토론·창의력 특강',period:'2027년 1~2월',grades:['초5','초6']},
    'special2027-navigator-1':{title:'대입 네비게이터 특강 1',period:'2027년 1~2월',grades:['중3','고1','고2']},
    'special2027-navigator-2':{title:'대입 네비게이터 특강 2',period:'2027년 1~2월',grades:['중3','고1','고2']},
    'special2027-experiment-12':{title:'초1·초2 올치 실험 특강',period:'2027년 1월',grades:['초1','초2']},
    'special2027-experiment-34':{title:'초3·초4 올치 실험 특강',period:'2027년 1월',grades:['초3','초4']},
    'special2027-experiment-56':{title:'초5·초6 올치 실험 특강',period:'2027년 1월',grades:['초5','초6']}
  };
  const extra=specials[c?.id];
  if(extra)return {key:c.id,title:extra.title,period:extra.period,audience:'2027년 '+extra.grades.join('·'),
    options:extra.grades.map(grade=>({value:'2027:'+grade,label:'2027년 '+grade,grade}))};
  if(!c||!/겨울방학|네비게이터/.test(c.title||''))return null;
  const middle=['y2027-F5','y2027-U5','winter2027-middle'].includes(c.id);
  const high=['y2027-M5','y2027-F51','winter2027-high'].includes(c.id);
  if(!middle&&!high)return null;
  const pairs=middle?[[2026,'초6','중1'],[2027,'중1','중1']]:[[2026,'중2','중3'],[2026,'중3','고1'],[2027,'중3','중3'],[2027,'고1','고1']];
  return {key:middle?'middle':'high',title:middle?'중등 네비게이터':'고등 네비게이터',period:'2027년 1~2월',
    audience:middle?'2026년 초6 · 2027년 중1':'2026년 중2·중3 · 2027년 중3·고1',
    options:pairs.map(([year,grade,nextGrade])=>({value:year+':'+grade,label:year+'년 '+grade,grade:nextGrade}))};
}
export function winter2027Grade(c,value){
  const special=winter2027Course(c);
  if(!special)return value===c.grade?{grade:value,label:'2027년 '+value}:null;
  return special.options.find(o=>o.value===value)||null;
}

export function excludedWeekendRoom2027(c){
  return ['토','일'].includes(c.day)&&/(?:^|[^0-9])2\s*교실(?:$|[^0-9])/.test(String(c.room||''));
}
export function scheduleKey2027(c){
  const base=[c.id,c.grade,c.title,c.day,c.start,c.end,c.room];
  if(c.bundle)base.push(c.sessions.map(s=>[s.id,s.day,s.start,s.end,s.room]));
  if(winter2027Course(c))base.push(winter2027Course(c).period);
  return JSON.stringify(base);
}
// A course is available only when both weekly sessions are unambiguous and have seats.
export function bundleWinter2027(classes){
  const allowed=classes.filter(c=>!excludedWeekendRoom2027(c));
  const result=allowed.filter(c=>!['middle','high'].includes(winter2027Course(c)?.key));
  for(const [key,ids,days] of [['middle',['y2027-F5','y2027-U5'],['월','수']],['high',['y2027-M5','y2027-F51'],['화','목']]]){
    const sessions=ids.map(id=>allowed.find(c=>c.id===id&&winter2027Course(c)));
    if(!sessions.some(Boolean))continue;
    const first=sessions.find(Boolean),profile=winter2027Course(first);
    const invalid=sessions.some((s,i)=>!s||s.review||s.day!==days[i]||!s.start||s.start>=s.end||s.end>'22:00'||!Number.isFinite(Number(s.capacity))||!Number.isFinite(Number(s.remaining)));
    const publicSessions=sessions.filter(Boolean).map(s=>({id:s.id,day:s.day,start:s.start,end:s.end,room:s.room}));
    const capacity=invalid?0:Math.min(...sessions.map(s=>Number(s.capacity)));
    result.push({id:'winter2027-'+key,grade:key==='middle'?'중1':'중3',title:profile.title+' · 주 2회',day:days.join('·'),days,
      start:first.start,end:first.end,room:[...new Set(publicSessions.map(s=>s.room))].join(' / '),capacity,
      remaining:invalid?0:Math.max(0,Math.min(...sessions.map(s=>Number(s.remaining)))),review:invalid,bundle:true,sessions:publicSessions});
  }
  return result;
}
export function scheduleLabel2027(c){
  return c.bundle?c.sessions.map(s=>s.day+'요일 '+s.start+'–'+s.end).join(' / ')+' · 주 2회':c.day+'요일 '+c.start+'–'+c.end;
}
