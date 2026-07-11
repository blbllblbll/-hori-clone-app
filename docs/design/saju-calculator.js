/**
 * 사주팔자 + 음력(간지) + 서양 점성술 기초 데이터 계산 예시
 *
 * 설치:
 *   npm install @fullstackfamily/manseryeok lunar-javascript astronomy-engine
 *
 * 주의:
 * - 이 파일은 "구조 예시"입니다. astronomy-engine의 정확한 함수 시그니처는
 *   실제 프로젝트에서 공식 문서로 재확인하세요 (버전에 따라 API가 다를 수 있음).
 * - 자미두수(紫微斗數) 명반 계산은 별도의 성계 배치 알고리즘이 필요합니다.
 *   직접 구현하기보다 공개된 참고 구현(예: github.com/rath/orrery)의
 *   로직 구조를 학습해서 라이선스에 맞게 재구현하는 것을 추천합니다.
 */

const { calculateSaju } = require('@fullstackfamily/manseryeok');
const { Solar } = require('lunar-javascript');
const Astronomy = require('astronomy-engine');

/**
 * @param {Object} birth
 * @param {number} birth.year
 * @param {number} birth.month
 * @param {number} birth.day
 * @param {number} birth.hour
 * @param {number} birth.minute
 * @param {number} birth.longitude  // 출생지 경도 (예: 서울 126.98)
 * @param {number} birth.latitude   // 출생지 위도 (예: 서울 37.57)
 */
function analyzeBirth(birth) {
  const { year, month, day, hour, minute, longitude, latitude } = birth;

  // 1. 사주팔자 (연/월/일/시주) - 진태양시 보정 포함
  const saju = calculateSaju(year, month, day, hour, minute, {
    longitude,
    applyTimeCorrection: true,
  });

  // 2. 음력 변환 + 간지 (자미두수 계산의 기초 데이터로 활용)
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();

  // 3. 서양 점성술 - 태양/달 위치 (황도 기준 좌표계로 변환 필요)
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const observer = new Astronomy.Observer(latitude, longitude, 0);

  const sunEcliptic = Astronomy.SunPosition(date); // 태양의 황경(黃經) 등
  const moonEquator = Astronomy.Equator(
    Astronomy.Body.Moon,
    date,
    observer,
    true,
    true
  );

  // 나머지 행성(수성~해왕성)도 동일한 패턴으로 반복 계산
  const planets = [
    'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  ].map((name) => ({
    name,
    position: Astronomy.Equator(Astronomy.Body[name], date, observer, true, true),
  }));

  return {
    saju: {
      yearPillar: saju.yearPillar,
      monthPillar: saju.monthPillar,
      dayPillar: saju.dayPillar,
      hourPillar: saju.hourPillar,
      isTimeCorrected: saju.isTimeCorrected,
    },
    lunarCalendar: {
      year: lunar.getYear(),
      month: lunar.getMonth(),
      day: lunar.getDay(),
    },
    astrology: {
      sunEcliptic,
      moonEquator,
      planets,
    },
  };
}

/**
 * 계산 결과를 Claude API 시스템 프롬프트에 넣을 컨텍스트 문자열로 변환
 */
function toPromptContext(analysis) {
  return `
[사주팔자]
년주: ${analysis.saju.yearPillar}
월주: ${analysis.saju.monthPillar}
일주: ${analysis.saju.dayPillar}
시주: ${analysis.saju.hourPillar}

[음력]
${analysis.lunarCalendar.year}년 ${analysis.lunarCalendar.month}월 ${analysis.lunarCalendar.day}일

[서양 점성술 - 주요 위치]
태양: ${JSON.stringify(analysis.astrology.sunEcliptic)}
달: ${JSON.stringify(analysis.astrology.moonEquator)}
`.trim();
}

module.exports = { analyzeBirth, toPromptContext };
