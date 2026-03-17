type PosterOptions = {
  email: string;
  createdAt: string;
  inputText?: string | null;
  rubric?: Record<string, number>;
  feedback?: string | null;
};

export function downloadAssessmentPoster(options: PosterOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#f6efe3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0f766e');
  gradient.addColorStop(0.5, '#1d4ed8');
  gradient.addColorStop(1, '#dd8b20');
  ctx.fillStyle = gradient;
  ctx.fillRect(72, 72, canvas.width - 144, 18);

  ctx.fillStyle = '#173127';
  ctx.font = '700 56px "Avenir Next", sans-serif';
  ctx.fillText('FluentOps AI Review', 72, 170);

  ctx.font = '400 28px "Avenir Next", sans-serif';
  ctx.fillStyle = '#557267';
  ctx.fillText(options.email, 72, 220);
  ctx.fillText(new Date(options.createdAt).toLocaleString(), 72, 260);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  roundRect(ctx, 72, 320, canvas.width - 144, 340, 34);
  ctx.fill();

  ctx.fillStyle = '#173127';
  ctx.font = '700 30px "Avenir Next", sans-serif';
  ctx.fillText('Assessment Snapshot', 112, 382);
  ctx.font = '400 26px "Avenir Next", sans-serif';
  wrapText(ctx, options.inputText || '(recording)', 112, 436, canvas.width - 224, 40, 4);

  const entries = Object.entries(options.rubric || {});
  entries.forEach(([key, value], index) => {
    const x = 72 + (index % 2) * 520;
    const y = 720 + Math.floor(index / 2) * 150;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    roundRect(ctx, x, y, 460, 118, 28);
    ctx.fill();
    ctx.fillStyle = '#557267';
    ctx.font = '700 22px "Avenir Next", sans-serif';
    ctx.fillText(key.toUpperCase(), x + 34, y + 42);
    ctx.fillStyle = '#173127';
    ctx.font = '700 42px "Avenir Next", sans-serif';
    ctx.fillText(`${value}%`, x + 34, y + 88);
  });

  ctx.fillStyle = 'rgba(23,49,39,0.08)';
  roundRect(ctx, 72, 1080, canvas.width - 144, 380, 34);
  ctx.fill();
  ctx.fillStyle = '#173127';
  ctx.font = '700 30px "Avenir Next", sans-serif';
  ctx.fillText('Coach Feedback', 112, 1142);
  ctx.font = '400 24px "Avenir Next", sans-serif';
  wrapText(ctx, options.feedback || 'Keep practicing every day.', 112, 1200, canvas.width - 224, 38, 6);

  const link = document.createElement('a');
  link.download = `fluentops-assessment-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  let line = '';
  let lineIndex = 0;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineIndex * lineHeight);
      line = word;
      lineIndex += 1;
      if (lineIndex >= maxLines) break;
      continue;
    }
    line = nextLine;
  }

  if (lineIndex < maxLines && line) {
    ctx.fillText(line, x, y + lineIndex * lineHeight);
  }
}
