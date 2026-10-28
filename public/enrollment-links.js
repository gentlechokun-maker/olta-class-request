export const EXISTING_GRADES=['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1'];
export const YEAR2027_GRADES=[...EXISTING_GRADES,'고2'];
export function gradeCode(grade){return ({초:'e',중:'m',고:'h'}[grade?.[0]]||'')+(grade?.slice(1)||'');}
export function yearGradeLabel(grade){return grade+' (27년 기준)';}
export function enrollmentRoute(search='',hash=''){
 const params=new URLSearchParams(search),tab=hash==='#winter'?'winter':hash==='#year2027'||params.get('year')==='2027'?'year2027':'existing';
 const grades=tab==='year2027'?YEAR2027_GRADES:tab==='existing'?EXISTING_GRADES:[];
 const requested=params.get('grade'),grade=grades.find(g=>gradeCode(g)===requested||g===requested)||'';
 return {tab,grade};
}
export function enrollmentPath(tab,grade=''){
 const grades=tab==='year2027'?YEAR2027_GRADES:EXISTING_GRADES;
 return (tab!=='winter'&&grades.includes(grade)?'?grade='+gradeCode(grade):'')+(tab==='year2027'?'#year2027':tab==='winter'?'#winter':'#classes');
}
export function enrollmentLinks(){return [...EXISTING_GRADES.map(grade=>({tab:'existing',grade,label:'수강 신청 및 변경 · '+grade,path:enrollmentPath('existing',grade)})),...YEAR2027_GRADES.map(grade=>({tab:'year2027',grade,label:'27년 수업 신청 · '+yearGradeLabel(grade),path:enrollmentPath('year2027',grade)})),{tab:'winter',grade:'',label:'겨울방학 특강 신청',path:'#winter'}];}

export function mobileWeekdays(rows,current=''){const days=['월','화','수','목','금','토','일'].filter(day=>rows.some(row=>row.day===day));return {days,day:days.includes(current)?current:days[0]||''};}
