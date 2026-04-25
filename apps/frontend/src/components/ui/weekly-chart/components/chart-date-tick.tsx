import React from 'react';
import { HijriDate } from '@awdah/shared';
import { hijriToGregorianDate } from '@/utils/date-utils';
import { CHART_TICK_FILL } from '@/lib/chart-theme';

interface ChartDateTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  locale: string;
  language: string;
  fmtNumber: (n: number) => string;
}

export const ChartDateTick: React.FC<ChartDateTickProps> = ({
  x = 0,
  y = 0,
  payload,
  locale,
  language,
  fmtNumber,
}) => {
  if (!payload?.value) return null;

  let dayName: string;
  let gregShort: string;
  let hijriFormatted: string;

  try {
    const dateStr = payload.value;
    const gregorianDate = hijriToGregorianDate(dateStr);

    dayName = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(gregorianDate);
    gregShort = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(
      gregorianDate,
    );

    const hijriDate = HijriDate.fromString(dateStr);
    const hijriLocale = (language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
    const baseFormat = hijriDate.format(hijriLocale);

    hijriFormatted =
      language === 'ar'
        ? baseFormat.replace(/\d+/g, (match) => fmtNumber(parseInt(match, 10)))
        : baseFormat;
  } catch {
    return null;
  }

  return (
    <g transform={`translate(${x},${y + 4})`}>
      <text textAnchor="middle" fill={CHART_TICK_FILL} fontSize={11}>
        <tspan x={0} dy={0}>
          {dayName}
        </tspan>
        <tspan x={0} dy={13} fontSize={10}>
          {gregShort}
        </tspan>
        <tspan x={0} dy={11} fontSize={9} opacity={0.65}>
          {hijriFormatted}
        </tspan>
      </text>
    </g>
  );
};
