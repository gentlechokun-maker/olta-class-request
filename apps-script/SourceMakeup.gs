// Mirror blue timetable entries into the private 보강 table. Only the
// separately dated entries and Wednesday Bae Sharon are auto-confirmed.
const SOURCE_MAKEUP_COLUMNS_=['sourceCell','sourceText','day','time','room','origin','updatedAt'];
function sourceMakeupColumn_(index){let out='';for(let n=index+1;n;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out;}
function sourceMakeupDate_(text,year){
  const hits=[...String(text).matchAll(/(?:20\d{2}[.\-/])?\d{1,2}[.\-/]\d{1,2}(?!\d)/g)];
  if(hits.length!==1)return '';
  const parts=hits[0][0].split(/[.\-/]/).map(Number),y=parts.length===3?parts[0]:year,m=parts[parts.length-2],d=parts[parts.length-1];
  if(!y||m<1||m>12||d<1||d>31)return '';
  const date=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  return Utilities.formatDate(new Date(date+'T12:00:00+09:00'),'Asia/Seoul','yyyy-MM-dd')===date?date:'';
}
function sourceMakeupRangeContains_(range,row,col){
  const m=/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(String(range||''));if(!m)return false;
  const column=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),start=column(m[1]),end=column(m[3]||m[1]);
  return row>=Number(m[2])&&row<=Number(m[4]||m[2])&&col>=start&&col<=end;
}
function sourceMakeupDay_(row,col){
  if(row<=40)return col>=3&&col<=8?'월':col>=10&&col<=15?'화':col>=17&&col<=22?'수':'';
  return col>=3&&col<=8?'목':col>=10&&col<=15?'금':col>=17&&col<=19?'토':col>=20&&col<=22?'일':'';
}
function sourceMakeupTime_(row,col){
  const day=sourceMakeupDay_(row,col);if(!day)return '';
  let startRow=9,startHour=14;
  if(row>40){
    if(day==='토'||day==='일'){
      if(row>=43&&row<47){startRow=43;startHour=9;}
      else if(row>=48){startRow=48;startHour=10;}
      else return '';
    }else if(row>=48){startRow=48;startHour=13;}
    else return '';
  }
  if(row<startRow)return '';
  const quarter=row-startRow,hour=startHour+Math.floor(quarter/4),minute=quarter%4*15;
  if(hour>22||hour===22&&minute>0)return '';
  return String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
}
function parseSourceMakeups_(values,colors,rich,classes,palette,sheetId,title){
  const year=Number(/^(20\d{2})년/.exec(title)?.[1]||0),out=[];
  for(let r=8;r<values.length;r++)for(let c=0;c<values[r].length;c++){
    const text=String(values[r][c]||'').trim();if(!text)continue;
    const item=rich?.[r]?.[c],runs=item?.getRuns?item.getRuns():[],base=String(colors?.[r]?.[c]||'#000000').toLowerCase();
    const blue=runs.length?runs.map(run=>({text:run.getText(),color:String(run.getTextStyle().getForegroundColor()||base).toLowerCase()})).filter(run=>palette[run.color]==='makeup').map(run=>run.text):palette[base]==='makeup'?[text]:[];
    if(!blue.length)continue;
    const head=blue.join(' ').trim();
    const names=[...head.matchAll(/(?:^|[\s,;\[])([가-힣]{2,5})(?![가-힣])/g)].map(match=>match[1]).filter(name=>!/^(내신대비|중등과학|고등과학|초등과학|수업내용|보강수업|한시간|두시간|세시간|삼십분|이론수업|실험수업)$/.test(name));
    if(!names.length)continue;
    const date=sourceMakeupDate_(text,year),clock=/(\d{1,2})시\s*(\d{1,2})?\s*분?/.exec(text);
    const row=r+1,col=c+1,cell=sourceMakeupColumn_(c)+row,sourceCell=title+'!'+cell,day=sourceMakeupDay_(row,col);
    if(!day)continue;
    const time=clock?String(Number(clock[1])).padStart(2,'0')+':'+String(Number(clock[2]||0)).padStart(2,'0'):sourceMakeupTime_(row,col);
    const room=String(values[row>=41?41:3]?.[c]||'').trim();
    const matches=classes.filter(cls=>sourceMakeupRangeContains_(cls.sourceRange,row,col));
    const classId=matches.length===1?matches[0].id:'';
    const weekday=date?['일','월','화','수','목','금','토'][new Date(date+'T12:00:00+09:00').getUTCDay()]:'';
    for(const [index,student] of names.entries()){
      const confirmed=Boolean(student&&(date&&weekday===day&&!classId||day==='수'&&student==='배샤론'));
      out.push({id:'source-'+sheetId+'-'+cell+'-'+index,classId,student,date,status:confirmed?'확정':'확인 필요',sourceCell,sourceText:text,day,time,room,origin:'원본 시간표',updatedAt:''});
    }
  }
  return out;
}
function ensureSourceMakeupColumns_(){
  const sheet=db_().getSheetByName('보강');if(!sheet)throw Error('운영 문서의 보강 표를 먼저 설정하세요.');
  const headers=TABLES_['보강'];if(sheet.getMaxColumns()<headers.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),headers.length-sheet.getMaxColumns());
  if(sheet.getRange(1,1,1,headers.length).getDisplayValues()[0].join('|')!==headers.join('|')){
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');delete READ_CACHE_['보강'];
  }
}
function syncSourceMakeups_(){
  const p=props_(),sourceId=p.getProperty('SOURCE_SPREADSHEET_ID'),sheetId=Number(p.getProperty('SOURCE_SHEET_ID'));
  if(!sourceId||!Number.isFinite(sheetId))throw Error('원본 시간표 연결을 먼저 설정하세요.');
  const sheet=SpreadsheetApp.openById(sourceId).getSheets().find(s=>s.getSheetId()===sheetId);if(!sheet)throw Error('원본 시간표 탭을 찾을 수 없습니다.');
  const height=Math.min(sheet.getLastRow(),120),width=Math.min(sheet.getLastColumn(),32);if(height<9||width<1)return {found:0,assigned:0,review:0};
  const range=sheet.getRange(1,1,height,width),palette={};read_('색상').forEach(p=>{if(/^#[a-f0-9]{6}$/i.test(p.hex))palette[p.hex.toLowerCase()]=p.status;});
  const parsed=parseSourceMakeups_(range.getDisplayValues(),range.getFontColors(),range.getRichTextValues(),classes_(),palette,sheetId,sheet.getName());
  ensureSourceMakeupColumns_();const existing=read_('보강'),timestamp=now_(),byId=new Map(existing.map(x=>[x.id,x])),seen=new Set();let changed=false;
  for(const entry of parsed){seen.add(entry.id);const old=byId.get(entry.id);
    const duplicate=existing.some(x=>x.id!==entry.id&&x.classId&&x.classId===entry.classId&&x.student===entry.student&&x.date===entry.date&&x.status==='배정');
    if(duplicate&&entry.status==='배정')entry.status='중복 확인 필요';
    if(old){if(old.status==='취소')entry.status='취소';entry.updatedAt=old.updatedAt||timestamp;
      if(SOURCE_MAKEUP_COLUMNS_.concat(['classId','student','date','status']).some(k=>k!=='updatedAt'&&String(old[k]||'')!==String(entry[k]||''))){Object.assign(old,entry,{updatedAt:timestamp});changed=true;}
    }else{entry.updatedAt=timestamp;existing.push(entry);byId.set(entry.id,entry);changed=true;}
  }
  for(const row of existing.filter(x=>x.origin==='원본 시간표'&&!seen.has(x.id)&&x.status!=='원본에서 제외')){row.status='원본에서 제외';row.updatedAt=timestamp;changed=true;}
  if(changed)write_('보강',existing);
  return {found:parsed.length,confirmed:parsed.filter(x=>x.status==='확정').length,review:parsed.filter(x=>x.status==='확인 필요'||x.status==='중복 확인 필요').length};
}
