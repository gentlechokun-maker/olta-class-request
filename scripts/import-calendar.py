"""Read date cells and week-band geometry from the supplied 2026 PowerPoint.
No student data is read. Source deck stays local; output contains dates only.
"""
import zipfile, xml.etree.ElementTree as E, datetime as dt, json
from pathlib import Path

ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main'}
r=E.fromstring(zipfile.ZipFile('연간달력_최종.pptx').read('ppt/slides/slide1.xml'))
frame=r.find('.//p:graphicFrame',ns); table=frame.find('.//a:tbl',ns)
cols=[int(c.get('w')) for c in table.findall('a:tblGrid/a:gridCol',ns)]
trs=table.findall('a:tr',ns); heights=[int(t.get('h')) for t in trs]
y0=int(frame.find('p:xfrm/a:off',ns).get('y'))
shapes=[]
for s in r.findall('.//p:sp',ns):
    off=s.find('p:spPr/a:xfrm/a:off',ns); ext=s.find('p:spPr/a:xfrm/a:ext',ns); fill=s.find('p:spPr/a:solidFill',ns)
    if off is None or ext is None or fill is None: continue
    color=list(fill)[0].get('val'); week={'FFFFCC':1,'CCFFCC':2,'accent4':3,'accent5':4}.get(color)
    if week or color=='FF0000': shapes.append((int(off.get('x')),int(off.get('y')),int(ext.get('cx')),int(ext.get('cy')),week or 'CLOSED'))
out=[]
for month in range(1,13):
    firstrow=3+9*((month-1)//4); firstcol=[1,9,18,26][(month-1)%4]
    for ri in range(firstrow,firstrow+6):
        for ci in range(firstcol,firstcol+7):
            tc=trs[ri].findall('a:tc',ns)[ci]; text=''.join(t.text or '' for t in tc.findall('.//a:t',ns))
            if not text.isdigit(): continue
            day=int(text); date=dt.date(2026,month,day)
            x=sum(cols[:ci])+cols[ci]/2; top=y0+sum(heights[:ri]); bottom=top+heights[ri]
            hits={w for sx,sy,sw,sh,w in shapes if sx<=x<=sx+sw and ((w=='CLOSED' and top<sy+sh/2<bottom) or (w!='CLOSED' and bottom-4*6350<sy+sh/2<bottom+20*6350))}
            if 'CLOSED' in hits: value='CLOSED'
            elif len(hits)==1: value=next(iter(hits))
            else: value='REVIEW'
            out.append({'date':str(date),'grade':'전체','week':value})
out.sort(key=lambda r:r['date'])
assert len(out)==365 and len({r['date'] for r in out})==365
# Each weekday advances independently; interrupted holiday weeks can straddle months.
cycles={i:1 for i in range(7)}; previous={i:0 for i in range(7)}
for row in out:
    weekday=dt.date.fromisoformat(row['date']).weekday(); week=row.pop('week')
    if isinstance(week,int):
        if week<previous[weekday]: cycles[weekday]+=1
        previous[weekday]=week
        row['weekId']=f'2026-{cycles[weekday]:02d}-W{week}'
    else: row['weekId']=week
Path('public/calendar-2026.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
Path('apps-script/Calendar.gs').write_text('// Generated from the supplied 2026 annual calendar.\nconst CALENDAR_2026_='+json.dumps(out,ensure_ascii=False)+';\n',encoding='utf-8')
Path('artifacts').mkdir(exist_ok=True)
Path('artifacts/수업주차-2026.tsv').write_text('date\tgrade\tweekId\n'+'\n'.join('\t'.join(r.values()) for r in out)+'\n',encoding='utf-8-sig')
print('Dates:',len(out),'closed:',sum(r['weekId']=='CLOSED' for r in out),'review:',[r['date'] for r in out if r['weekId']=='REVIEW'])
for month in range(1,13): print(month,[(r['date'][8:],r['weekId']) for r in out if int(r['date'][5:7])==month])

