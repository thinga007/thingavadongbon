
export interface ElementOffset {
  dx: number;
  dy: number;
  scale: number;
  letterSpacing?: number;
}

export interface WatermarkData {
  unitName: string;
  task: string;
  time: string;
  date: string;
  dateMode: '1-row' | '2-row';
  info1: string;
  info2: string;
  info3: string;
  id: string;
}

export const INITIAL_DATA: WatermarkData = {
  unitName: "CÔNG AN PHƯỜNG 1",
  task: "TUẦN TRA ĐẢM BẢO ANTT",
  time: "22:02",
  date: "Thứ Bảy, 07/06/2025",
  dateMode: '2-row',
  info1: "138 Cách Mạng Tháng Tám",
  info2: "Khu phố 3, Tây Ninh",
  info3: "10.967342°N, 106.853483°E",
  id: "🛡 LPTRBM1DGWBNAN Timemark Verified"
};

export const INITIAL_CONFIGS = {
  box: { x: 30, y: 580, w: 620, h: 400, scale: 1.0, opacity: 0.85, borderRadius: 24 },
  map: { x: 30, y: 30, w: 200, h: 200, scale: 1.0, opacity: 0.9, borderRadius: 20 },
  logo: { dx: 30, dy: 25, scale: 1.0 },
  unitName: { dx: 160, dy: 60, scale: 1.0, letterSpacing: 0.5 },
  task: { dx: 160, dy: 105, scale: 1.0, letterSpacing: 0.5 },
  time: { dx: 30, dy: 245, scale: 1.1, letterSpacing: 1 },
  date: { dx: 270, dy: 205, scale: 1.0, letterSpacing: 0.5 },
  info1: { dx: 30, dy: 295, scale: 1.0, letterSpacing: 0 },
  info2: { dx: 30, dy: 330, scale: 1.0, letterSpacing: 0 },
  info3: { dx: 30, dy: 365, scale: 1.0, letterSpacing: 0 },
  id: { x: 975, y: 500, scale: 1.0, opacity: 0.6, letterSpacing: 2 }
};
