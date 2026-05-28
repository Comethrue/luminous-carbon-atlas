/** Types for the real-time environment data */

export interface LightingImpact {
  need_artificial_light: boolean;
  natural_light_sufficient: boolean;
  recommended_brightness_pct: number;
  factors: string[];
}

export interface WeatherData {
  temp: number;
  humidity: number;
  cloud: number;
  solar_radiation: number;
  weather_text: string;
  wind_speed: number;
  visibility: number;
  aqi: number;
  pm2p5: number;
  is_day: boolean;
  lighting_impact: LightingImpact;
  _source: string;
}

export interface CarbonIntensity {
  value: number;
  unit: string;
  source: string;
}

export interface EnvironmentData {
  weather: WeatherData;
  carbonIntensity: CarbonIntensity;
  timestamp: string;
}

export interface LightingAdvice {
  timestamp: string;
  solarRadiation: number;
  cloudCover: number;
  visibility: number;
  isDay: boolean;
  need_artificial_light: boolean;
  natural_light_sufficient: boolean;
  recommended_brightness_pct: number;
  factors: string[];
}

export interface Announcement {
  type: 'weather' | 'aqi' | 'carbon' | 'system';
  icon: string;
  text: string;
  time: string;
}

export interface Broadcast {
  announcements: Announcement[];
  timestamp: string;
}
