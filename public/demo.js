import {curriculum} from './domain.js';
// Fictional times/counts. Curriculum follows the user's second-semester rules.
export function demoCatalog(){const data={
  "mode": "demo",
  "semester": 2,
  "updatedAt": null,
  "privacyContact": "운영 전 상담 담당 연락처를 설정해 주세요.",
  "retentionDays": 90,
  "classes": [
    {
      "id": "demo-c1",
      "grade": "초1",
      "day": "월",
      "start": "13:00",
      "end": "14:00",
      "room": "2교실",
      "registered": 3,
      "starting": 1,
      "teacher": "담당 A",
      "teacherColor": "#e8eed8"
    },
    {
      "id": "demo-c2",
      "grade": "초2",
      "day": "화",
      "start": "13:00",
      "end": "14:00",
      "room": "2교실",
      "registered": 3,
      "starting": 0,
      "teacher": "담당 A",
      "teacherColor": "#e8eed8"
    },
    {
      "id": "demo-c3",
      "grade": "초3",
      "day": "월",
      "start": "15:00",
      "end": "16:00",
      "room": "2교실",
      "registered": 4,
      "starting": 0,
      "teacher": "담당 A",
      "teacherColor": "#e8eed8"
    },
    {
      "id": "demo-c4",
      "grade": "초4",
      "day": "화",
      "start": "15:00",
      "end": "16:00",
      "room": "3교실",
      "registered": 3,
      "starting": 2,
      "teacher": "담당 B",
      "teacherColor": "#e3edf3"
    },
    {
      "id": "demo-c5",
      "grade": "초5",
      "day": "수",
      "start": "15:00",
      "end": "16:00",
      "room": "2교실",
      "registered": 6,
      "starting": 0,
      "teacher": "담당 A",
      "teacherColor": "#e8eed8"
    },
    {
      "id": "demo-c6",
      "grade": "초6",
      "day": "목",
      "start": "15:00",
      "end": "17:00",
      "room": "5교실",
      "registered": 3,
      "starting": 0,
      "teacher": "담당 C",
      "teacherColor": "#f2e5d8"
    },
    {
      "id": "demo-c7",
      "grade": "중1",
      "day": "금",
      "start": "17:00",
      "end": "19:00",
      "room": "3교실",
      "registered": 4,
      "starting": 1,
      "teacher": "담당 B",
      "teacherColor": "#e3edf3"
    },
    {
      "id": "demo-c8",
      "grade": "중2",
      "day": "토",
      "start": "10:00",
      "end": "13:00",
      "room": "5교실",
      "registered": 2,
      "starting": 1,
      "teacher": "담당 C",
      "teacherColor": "#f2e5d8"
    },
    {
      "id": "demo-c9",
      "grade": "중3",
      "day": "금",
      "start": "17:00",
      "end": "20:00",
      "room": "5교실",
      "registered": 3,
      "starting": 0,
      "teacher": "담당 C",
      "teacherColor": "#f2e5d8"
    },
    {
      "id": "demo-c10",
      "grade": "중3",
      "day": "토",
      "start": "10:00",
      "end": "12:00",
      "room": "3교실",
      "registered": 4,
      "starting": 0,
      "teacher": "담당 B",
      "teacherColor": "#e3edf3"
    }
  ],
  "slots": [
    {
      "id": "demo-s1",
      "day": "화",
      "start": "15:00",
      "end": "17:00",
      "room": "2교실",
      "grades": [
        "초1",
        "초2",
        "초3",
        "초4",
        "초5"
      ]
    },
    {
      "id": "demo-s2",
      "day": "수",
      "start": "17:00",
      "end": "19:00",
      "room": "3교실",
      "grades": [
        "초5",
        "초6",
        "중1"
      ]
    },
    {
      "id": "demo-s3",
      "day": "토",
      "start": "13:00",
      "end": "16:00",
      "room": "5교실",
      "grades": [
        "중2"
      ]
    },
    {
      "id": "demo-s4",
      "day": "토",
      "start": "13:00",
      "end": "15:00",
      "room": "3교실",
      "grades": [
        "중1",
        "중3"
      ]
    }
  ],
  "demand": {
    "demo-s1|초1": 1,
    "demo-s1|초2": 2,
    "demo-s1|초3": 2,
    "demo-s1|초4": 1,
    "demo-s2|초5": 3,
    "demo-s3|중2": 1
  }
};
 data.classes=data.classes.map(c=>({...c,title:curriculum(c.grade,c.day,2).name,lesson:curriculum(c.grade,c.day,2).lesson,remaining:6-c.registered-c.starting,used:c.registered+c.starting,review:false}));return data;}
