
export interface ElementOffset {
  dx: number;
  dy: number;
  scale: number;
  thickness?: number;
  w?: number;
  letterSpacing?: number;
  opacity?: number;
  vSpacing?: number; // Thêm cho kéo giãn lên xuống
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
  unitName: "Công an phường 1",
  task: "Tuần tra đảm bảo\nANTT",
  time: "22:02",
  date: "Thứ Bảy\n07/06/2025",
  dateMode: '2-row',
  info1: "138 Cách Mạng Tháng Tám,",
  info2: "Khu phố 3, Tây Ninh",
  info3: "11.3126°N, 106.0984°E",
  id: "🛡 LPTRBM1DGWBNAN Timemark Verified"
};

export const INITIAL_CONFIGS = {
  box: { x: 30, y: 550, w: 450, h: 420, scale: 1.0, opacity: 0.9, borderRadius: 8 },
  map: { x: 30, y: 30, w: 230, h: 180, scale: 1.0, opacity: 1.0, borderRadius: 5 },
  sepLine: { dy: 145, scale: 1.0, thickness: 1.5, opacity: 1.0 },
  sepArrows: { dy: 155, scale: 0.6, opacity: 0.6 },
  logo: { dx: 15, dy: 15, scale: 0.75 },
  unitName: { dx: 125, dy: 50, scale: 1.05, letterSpacing: 0, vSpacing: 0 },
  task: { dx: 125, dy: 90, scale: 0.85, letterSpacing: 0, vSpacing: 0 },
  time: { dx: 25, dy: 270, scale: 1.0, letterSpacing: 0, vSpacing: 0 },
  date: { dx: 195, dy: 230, scale: 1.0, letterSpacing: 0, vSpacing: 0 },
  info1: { dx: 45, dy: 325, scale: 1.0, letterSpacing: 0, vSpacing: 0 },
  info2: { dx: 45, dy: 370, scale: 1.0, letterSpacing: 0, vSpacing: 0 },
  info3: { dx: 45, dy: 410, scale: 0.8, letterSpacing: 0, vSpacing: 0 },
  id: { x: 985, y: 500, scale: 1.0, opacity: 0.4, letterSpacing: 1 },
  verifiedStamp: { x: 975, y: 975, scale: 1.0, opacity: 1.0 }
};
