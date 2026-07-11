/**
 * 사주팔자 + 음력(간지) + 서양 점성술 기초 데이터 계산
 *
 * docs/design/saju-calculator.js의 설계를 그대로 따르되, 실제 라이브러리
 * (@fullstackfamily/manseryeok, lunar-javascript, astronomy-engine) API에
 * 맞춰 포팅한 버전. 계산과 해석은 분리한다: 여기서 나온 결과값만 신뢰하고,
 * Claude에게는 이 결과를 그대로 해석시킨다 (docs/design/app-architecture.md 4절).
 */
import { calculateSaju } from '@fullstackfamily/manseryeok';
import { Lunar, Solar } from 'lunar-javascript';
import * as Astronomy from 'astronomy-engine';

import type { AstrologyInfo, BirthAnalysis, BirthInput, LunarCalendarInfo, PlanetPosition, SajuPillars } from '../types';

const OUTER_PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;

function toSolarDate(birth: BirthInput) {
  if (birth.calendarType === 'solar') {
    return { year: birth.year, month: birth.month, day: birth.day };
  }
  const lunar = Lunar.fromYmd(birth.year, birth.month, birth.day);
  const solar = lunar.getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
}

function calculatePillars(birth: BirthInput): SajuPillars {
  const { year, month, day } = toSolarDate(birth);
  const result = calculateSaju(year, month, day, birth.hour, birth.minute, {
    longitude: birth.longitude,
    applyTimeCorrection: true,
  });

  return {
    yearPillar: result.yearPillar,
    yearPillarHanja: result.yearPillarHanja,
    monthPillar: result.monthPillar,
    monthPillarHanja: result.monthPillarHanja,
    dayPillar: result.dayPillar,
    dayPillarHanja: result.dayPillarHanja,
    hourPillar: result.hourPillar,
    hourPillarHanja: result.hourPillarHanja,
    isTimeCorrected: result.isTimeCorrected,
    correctedTime: result.correctedTime,
  };
}

function calculateLunarInfo(birth: BirthInput): LunarCalendarInfo {
  const { year, month, day } = toSolarDate(birth);
  const solar = Solar.fromYmdHms(year, month, day, birth.hour, birth.minute, 0);
  const lunar = solar.getLunar();

  return {
    year: lunar.getYear(),
    month: Math.abs(lunar.getMonth()),
    day: lunar.getDay(),
    isLeapMonth: lunar.getMonth() < 0,
    yearGanZhi: lunar.getYearInGanZhi(),
    monthGanZhi: lunar.getMonthInGanZhi(),
    dayGanZhi: lunar.getDayInGanZhi(),
  };
}

function toPlanetPosition(name: string, equator: Astronomy.EquatorialCoordinates): PlanetPosition {
  return {
    name,
    rightAscension: equator.ra,
    declination: equator.dec,
    distanceAu: equator.dist,
  };
}

function calculateAstrology(birth: BirthInput): AstrologyInfo {
  const { year, month, day } = toSolarDate(birth);
  const date = new Date(Date.UTC(year, month - 1, day, birth.hour, birth.minute));
  const observer = new Astronomy.Observer(birth.latitude, birth.longitude, 0);

  const sunEcliptic = Astronomy.SunPosition(date);
  const moonEquator = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);

  const planets = OUTER_PLANETS.map((name) =>
    toPlanetPosition(name, Astronomy.Equator(Astronomy.Body[name], date, observer, true, true))
  );

  return {
    sunEclipticLongitude: sunEcliptic.elon,
    moon: toPlanetPosition('Moon', moonEquator),
    planets,
  };
}

/**
 * 자미두수(紫微斗數) 명반은 공개 npm 라이브러리가 없다.
 * docs/design/app-architecture.md는 github.com/rath/orrery 같은 참고 구현의
 * "로직 구조"만 학습해 라이선스에 맞게 재구현할 것을 권장한다.
 * 이 함수는 실제 성계 배치 알고리즘이 들어오기 전까지의 자리표시자다.
 */
function calculateZiweiPlaceholder() {
  return {
    available: false as const,
    note: '자미두수 명반 계산은 아직 준비 중이에요. 곧 만나요!',
  };
}

export function analyzeBirth(birth: BirthInput): BirthAnalysis {
  return {
    birth,
    saju: calculatePillars(birth),
    lunarCalendar: calculateLunarInfo(birth),
    astrology: calculateAstrology(birth),
    ziwei: calculateZiweiPlaceholder(),
    calculatedAt: new Date().toISOString(),
  };
}

/** 계산 결과를 Claude API 시스템 프롬프트에 넣을 컨텍스트 문자열로 변환 */
export function toPromptContext(analysis: BirthAnalysis): string {
  const { saju, lunarCalendar, astrology } = analysis;

  return `
[사주팔자]
년주: ${saju.yearPillar} (${saju.yearPillarHanja})
월주: ${saju.monthPillar} (${saju.monthPillarHanja})
일주: ${saju.dayPillar} (${saju.dayPillarHanja})
시주: ${saju.hourPillar ?? '미상'} (${saju.hourPillarHanja ?? '-'})
${saju.isTimeCorrected && saju.correctedTime ? `진태양시 보정: ${saju.correctedTime.hour}시 ${saju.correctedTime.minute}분` : ''}

[음력 · 간지]
${lunarCalendar.year}년 ${lunarCalendar.isLeapMonth ? '윤' : ''}${lunarCalendar.month}월 ${lunarCalendar.day}일
연주 간지: ${lunarCalendar.yearGanZhi} / 월주 간지: ${lunarCalendar.monthGanZhi} / 일주 간지: ${lunarCalendar.dayGanZhi}

[서양 점성술 - 주요 위치]
태양 황경: ${astrology.sunEclipticLongitude.toFixed(2)}도
달: 적경 ${astrology.moon.rightAscension.toFixed(2)}h / 적위 ${astrology.moon.declination.toFixed(2)}도
${astrology.planets.map((p) => `${p.name}: 적경 ${p.rightAscension.toFixed(2)}h / 적위 ${p.declination.toFixed(2)}도`).join('\n')}

[자미두수]
${analysis.ziwei.note}
`.trim();
}
