export type CalendarType = 'solar' | 'lunar';

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  gender: 'male' | 'female';
  placeName: string;
  longitude: number;
  latitude: number;
}

export interface SajuPillars {
  yearPillar: string;
  yearPillarHanja: string;
  monthPillar: string;
  monthPillarHanja: string;
  dayPillar: string;
  dayPillarHanja: string;
  hourPillar: string | null;
  hourPillarHanja: string | null;
  isTimeCorrected: boolean;
  correctedTime?: { hour: number; minute: number };
}

export interface LunarCalendarInfo {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
}

export interface PlanetPosition {
  name: string;
  rightAscension: number;
  declination: number;
  distanceAu: number;
}

export interface AstrologyInfo {
  sunEclipticLongitude: number;
  moon: PlanetPosition;
  planets: PlanetPosition[];
}

/**
 * 자미두수 명반은 공개된 npm 라이브러리가 없어 자체 성계 배치 알고리즘이 필요하다
 * (docs/design/app-architecture.md 참고). 실제 배포 전 반드시 전용 로직으로 교체할 것.
 */
export interface ZiweiPlaceholder {
  available: false;
  note: string;
}

export interface BirthAnalysis {
  birth: BirthInput;
  saju: SajuPillars;
  lunarCalendar: LunarCalendarInfo;
  astrology: AstrologyInfo;
  ziwei: ZiweiPlaceholder;
  calculatedAt: string;
}

export type ChatCategory = 'love' | 'wealth' | 'career' | 'today';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  category?: ChatCategory;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  credits: number;
  createdAt: string;
}

export const CREDIT_PRODUCT_IDS = {
  tier1: 'donation_tier1_1500won',
  tier2: 'donation_tier2_3000won',
  tier3: 'donation_tier3_5000won',
} as const;

export type DonationTier = keyof typeof CREDIT_PRODUCT_IDS;
