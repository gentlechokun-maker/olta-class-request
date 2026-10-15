// Shared review validation. Applicant details and answers stay on the server.
export const REVIEW_VERSION = '2026-10-15-review';
export const REVIEW_QUESTIONS = [
  '오늘 설명회를 통해 새롭게 알게 되거나, 가장 마음에 남은 이야기는 무엇인가요?',
  '우리 아이의 교육에 대해 생각이 달라진 부분이 있으신가요?',
  "앞으로 올타에듀가 우리 아이에게 어떤 '깨달음의 기쁨'을 선물해 주기를 바라시나요?",
  '오늘 설명회에서 아쉬웠던 점이나 더 듣고 싶은 이야기가 있으신가요?'
];
export function validateReview(input) {
  if (input.website || input.consent !== 'yes' || input.privacyVersion !== REVIEW_VERSION) throw Error('후기 수집·이용 동의를 확인해 주세요.');
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(input.requestId || '')) throw Error('후기 화면을 새로고침해 주세요.');
  const eventId = String(input.eventId || '').trim();
  if (!eventId || eventId.length > 80) throw Error('참석한 설명회를 선택해 주세요.');
  const raw = String(input.satisfaction ?? '').trim();
  if (!/^(?:[0-9](?:\.\d)?|10(?:\.0)?)$/.test(raw)) throw Error('오늘 설명회 만족도를 0~10 VAS 막대에서 선택해 주세요.');
  const answers = {};
  for (let n = 1; n <= 4; n++) {
    const answer = String(input['answer' + n] || '').trim();
    if (answer.length > 2000) throw Error(n + '번 답변은 2,000자 이내로 적어 주세요.');
    answers['answer' + n] = answer;
  }
  const registrationId = String(input.registrationId || '').trim();
  const registrationToken = String(input.registrationToken || '').trim();
  let parent = '', phone = '';
  if (registrationId || registrationToken) {
    if (!/^[a-zA-Z0-9-]{16,64}$/.test(registrationId) || !/^[a-f0-9]{32,64}$/i.test(registrationToken)) throw Error('후기 전용 링크를 다시 열어 주세요.');
  } else {
    parent = String(input.parent || '').trim();
    phone = String(input.phone || '').replace(/\D/g, '');
    if (parent.length < 2 || parent.length > 30 || /[<>\r\n]/.test(parent) || !/^01[016789]\d{7,8}$/.test(phone)) throw Error('설명회 신청 시 입력한 학부모 이름과 휴대전화 번호를 확인해 주세요.');
  }
  return {requestId:input.requestId,eventId,registrationId,registrationToken,parent,phone,...answers,satisfaction:Number(raw)};
}
