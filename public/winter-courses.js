// Public course rules; no teacher or student records belong here.
export function winter2027Course(c){
  if(!c||!/겨울방학|네비게이터/.test(c.title||''))return null;
  const middle=['y2027-F5','y2027-U5'].includes(c.id);
  const high=['y2027-M5','y2027-F47'].includes(c.id);
  if(!middle&&!high)return null;
  const pairs=middle?[[2026,'초6','중1'],[2027,'중1','중1']]:[[2026,'중2','중3'],[2026,'중3','고1'],[2027,'중3','중3'],[2027,'고1','고1']];
  return {key:middle?'middle':'high',title:middle?'중등 네비게이터':'고등 네비게이터',
    audience:middle?'2026년 초6 · 2027년 중1':'2026년 중2·중3 · 2027년 중3·고1',
    options:pairs.map(([year,grade,nextGrade])=>({value:year+':'+grade,label:year+'년 '+grade,grade:nextGrade}))};
}
export function winter2027Grade(c,value){
  const special=winter2027Course(c);
  if(!special)return value===c.grade?{grade:value,label:'2027년 '+value}:null;
  return special.options.find(o=>o.value===value)||null;
}
