import { QRCodeCanvas } from 'qrcode.react';

// Canvas renders reliably in print, unlike the prototype's hand-drawn static
// SVG (which was identical for every booking and not scannable).
export function QrCode({ value, size = 96, className }) {
  if (!value) return null;
  return (
    <div className={className}>
      <QRCodeCanvas value={String(value)} size={size} level="M" includeMargin={false} />
    </div>
  );
}
